import { Dictionary, FilterQuery } from '@mikro-orm/core';
import { EntityRepository } from '@mikro-orm/mongodb';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { Repository, Search } from 'redis-om';
import slugify from 'slugify';
import { v4 as uuidV4 } from 'uuid';
import { BaseRedisEntity } from './entities/base.redis-entity';
import { AfterCursorEnum } from './enums/after-cursor.enum';
import { ChangeTypeEnum } from './enums/change-type.enum';
import {
  getOppositeOrder,
  getQueryOrder,
  QueryOrderEnum,
  tOppositeOrder,
  tOrderEnum,
} from './enums/query-order.enum';
import { IBase } from './interfaces/base.interface';
import { IChange } from './interfaces/change.interface';
import { IEdge, IPaginated } from './interfaces/paginated.interface';

@Injectable()
export class CommonService {
  //-------------------- Cursor Pagination --------------------

  /**
   * Encode Cursor
   *
   * Takes a date, string or number and returns the base 64
   * representation of it
   */
  private static encodeCursor(val: Date | string | number): string {
    let str: string;

    if (val instanceof Date) {
      str = val.getTime().toString();
    } else if (typeof val === 'number' || typeof val === 'bigint') {
      str = val.toString();
    } else {
      str = val;
    }

    return Buffer.from(str, 'utf-8').toString('base64');
  }

  /**
   * Create Edge
   *
   * Takes an instance, the cursor key and a innerCursor,
   * and generates a GraphQL edge
   */
  private static createEdge<T>(
    instance: T,
    cursor: keyof T,
    innerCursor?: string,
  ): IEdge<T> {
    try {
      return {
        node: instance,
        cursor: CommonService.encodeCursor(
          innerCursor ? instance[cursor][innerCursor] : instance[cursor],
        ),
      };
    } catch (_) {
      throw new InternalServerErrorException('The given cursor is invalid');
    }
  }

  /**
   * Get Order By
   *
   * Makes the order by query for MikroORM orderBy method.
   */
  private static getOrderBy<T>(
    cursor: keyof T,
    order: QueryOrderEnum,
    innerCursor?: string,
  ): Record<string, QueryOrderEnum | Record<string, QueryOrderEnum>> {
    return innerCursor
      ? {
          [cursor]: {
            [innerCursor]: order,
          },
        }
      : {
          [cursor]: order,
        };
  }

  /**
   * Get Filters
   *
   * Gets the where clause filter logic for the query builder pagination
   */
  private static getFilters<T>(
    cursor: keyof T,
    decoded: string | number | Date,
    order: tOrderEnum | tOppositeOrder,
    innerCursor?: string,
  ): FilterQuery<Dictionary<T>> {
    return innerCursor
      ? {
          [cursor]: {
            [innerCursor]: {
              [order]: decoded,
            },
          },
        }
      : {
          [cursor]: {
            [order]: decoded,
          },
        };
  }

  //-------------------- Repository Pagination --------------------

  /**
   * Paginate
   *
   * Takes an entity array and returns the paginated type of that entity array
   * It uses cursor pagination as recommended in https://relay.dev/graphql/connections.htm
   */
  public paginate<T>(
    instances: T[],
    currentCount: number,
    previousCount: number,
    cursor: keyof T,
    first: number,
    innerCursor?: string,
  ): IPaginated<T> {
    const pages: IPaginated<T> = {
      currentCount,
      previousCount,
      edges: [],
      pageInfo: {
        endCursor: '',
        startCursor: '',
        hasPreviousPage: false,
        hasNextPage: false,
      },
    };
    const len = instances.length;

    if (len > 0) {
      for (let i = 0; i < len; i++) {
        pages.edges.push(
          CommonService.createEdge(instances[i], cursor, innerCursor),
        );
      }
      pages.pageInfo.startCursor = pages.edges[0].cursor;
      pages.pageInfo.endCursor = pages.edges[len - 1].cursor;
      pages.pageInfo.hasNextPage = currentCount > first;
      pages.pageInfo.hasPreviousPage = previousCount > 0;
    }

    return pages;
  }

  //-------------------- Notification Generation --------------------

  /**
   * Decode Cursor
   *
   * Takes a base64 cursor and returns the string or number value
   */
  public decodeCursor(
    cursor: string,
    cursorType: AfterCursorEnum = AfterCursorEnum.STRING,
  ): string | number | Date {
    const str = Buffer.from(cursor, 'base64').toString('utf-8');

    switch (cursorType) {
      case AfterCursorEnum.DATE:
        const milliUnix = parseInt(str, 10);

        if (isNaN(milliUnix))
          throw new BadRequestException(
            'Cursor does not reference a valid date',
          );

        return new Date(milliUnix);
      case AfterCursorEnum.NUMBER:
        const num = parseInt(str, 10);

        if (isNaN(num))
          throw new BadRequestException(
            'Cursor does not reference a valid number',
          );

        return num;
      case AfterCursorEnum.STRING:
      default:
        return str;
    }
  }

  //-------------------- String Formatting --------------------

  /**
   * Find And Count Pagination
   *
   * Takes an entity repository and a FilterQuery and returns the paginated
   * entities
   */
  public async findAndCountPagination<T extends IBase>(
    cursor: keyof T,
    first: number,
    order: QueryOrderEnum,
    repo: EntityRepository<T>,
    where: FilterQuery<T>,
    after?: string,
    afterCursor: AfterCursorEnum = AfterCursorEnum.STRING,
    innerCursor?: string,
  ): Promise<IPaginated<T>> {
    let previousCount = 0;

    if (after) {
      const decoded = this.decodeCursor(after, afterCursor);
      const queryOrder = getQueryOrder(order);
      const oppositeOrder = getOppositeOrder(order);
      const countWhere = where;
      countWhere['$and'] = CommonService.getFilters(
        'createdAt',
        decoded,
        oppositeOrder,
        innerCursor,
      );
      previousCount = await repo.count(countWhere);
      where['$and'] = CommonService.getFilters(
        'createdAt',
        decoded,
        queryOrder,
        innerCursor,
      );
    }

    const [entities, count] = await repo.findAndCount(where, {
      orderBy: CommonService.getOrderBy(cursor, order, innerCursor),
      limit: first,
    });

    return this.paginate(
      entities,
      count,
      previousCount,
      cursor,
      first,
      innerCursor,
    );
  }

  public async redisPagination<T extends BaseRedisEntity>(
    cursor: keyof T,
    first: number,
    order: QueryOrderEnum,
    repo: Repository<T>,
    searchFunction: (r: Repository<T>) => Search<T>,
    after?: string,
    afterCursor: AfterCursorEnum = AfterCursorEnum.STRING,
  ): Promise<IPaginated<T>> {
    let previousCount = 0;
    const mainSearch = searchFunction(repo);

    if (after) {
      const decoded = this.decodeCursor(after, afterCursor);
      const innerSearch = searchFunction(repo);

      if (order === QueryOrderEnum.ASC) {
        mainSearch.and(cursor as string).gt(decoded);
        previousCount = await innerSearch
          .and(cursor as string)
          .lt(decoded)
          .return.count();
      } else {
        mainSearch.and(cursor as string).lt(decoded);
        previousCount = await innerSearch
          .and(cursor as string)
          .gt(decoded)
          .return.count();
      }
    }

    const [count, entities] = await this.throwInternalError(
      Promise.all([
        mainSearch.return.count(),
        mainSearch
          .sortBy(cursor as string, order)
          .return.all({ pageSize: first }),
      ]),
    );

    return this.paginate(entities, count, previousCount, cursor, first);
  }

  /**
   * Generate Notification
   *
   * Generates an entity notification. This is useful for realtime apps only.
   */
  public generateChange<T>(
    entity: T,
    nType: ChangeTypeEnum,
    cursor: keyof T,
  ): IChange<T> {
    return {
      edge: CommonService.createEdge(entity, cursor),
      type: nType,
    };
  }

  /**
   * Format Title
   *
   * Takes a string trims it and capitalizes every word
   */
  public formatTitle(title: string): string {
    return title
      .trim()
      .replace(/\n/g, ' ')
      .replace(/\s\s+/g, ' ')
      .replace(/\w\S*/g, (w) => w.replace(/^\w/, (l) => l.toUpperCase()));
  }

  /**
   * Format Search
   *
   * Takes a string trims it and makes it lower case to be used in ILike
   */
  public formatSearch(search: string): RegExp {
    return new RegExp(this.formatRedisSearch(search), 'i');
  }

  public formatRedisSearch(search: string): string {
    return search
      .trim()
      .replace(/\n/g, ' ')
      .replace(/\s\s+/g, ' ')
      .toLowerCase();
  }

  //-------------------- Entity Validations --------------------

  /**
   * Generate Point Slug
   *
   * Takes a string and generates a slug with dots as word separators
   */
  public generatePointSlug(str: string): string {
    return slugify(str, { lower: true, replacement: '.', remove: /['_\.]/g });
  }

  /**
   * Generate Slug
   *
   * Takes a string and generates a slug with a unique identifier at the end
   */
  public generateSlug(str: string): string {
    return slugify(`${str} ${uuidV4().substring(0, 6)}`, {
      lower: true,
      remove: /['_\.]/g,
    });
  }

  //-------------------- Entity Actions --------------------

  /**
   * Check Existence
   *
   * Checks if a findOne query didn't return null or undefined
   */
  public checkExistence<T>(name: string, entity?: T | null): void {
    if (!entity) throw new NotFoundException(`${name} not found`);
  }

  /**
   * Validate Entity
   *
   * Validates an entity with the class-validator library
   */
  public async validateEntity(entity: Dictionary): Promise<void> {
    const errors = await validate(entity);

    if (errors.length > 0)
      throw new BadRequestException('Entity validation failed');
  }

  //-------------------- Error Handling --------------------

  /**
   * Save Entity
   *
   * Validates, saves and flushes entity into the DB
   */
  public async saveEntity<T = Dictionary>(
    repo: EntityRepository<T>,
    entity: T,
    isNew = false,
    duplicateMessage?: string,
  ): Promise<void> {
    await this.validateEntity(entity);

    if (isNew) repo.persist(entity);

    await this.throwDuplicateError(repo.flush(), duplicateMessage);
  }

  public async saveRedisEntity<T extends BaseRedisEntity>(
    repo: Repository<T>,
    entity: T,
    expiration = 0,
  ): Promise<void> {
    entity.updatedAt = new Date();
    await this.validateEntity(entity);
    await this.throwInternalError(repo.save(entity));

    if (expiration > 0) {
      await this.throwInternalError(repo.expire(entity.entityId, expiration));
    }
  }

  /**
   * Remove Entity
   *
   * Removes an entity from the DB.
   */
  public async removeEntity<T = Dictionary>(
    repo: EntityRepository<T>,
    entity: T,
  ): Promise<void> {
    await this.throwInternalError(repo.removeAndFlush(entity));
  }

  public async removeRedisEntity<T extends BaseRedisEntity>(
    repo: Repository<T>,
    entity: T,
  ): Promise<void> {
    await this.throwInternalError(repo.remove(entity.entityId));
  }

  //-------------------- Private Methods --------------------

  /**
   * Throw Duplicate Error
   *
   * Checks is an error is of the code 23505, PostgreSQL's duplicate value error,
   * and throws a conflict exception
   */
  public async throwDuplicateError<T>(promise: Promise<T>, message?: string) {
    try {
      return await promise;
    } catch (error) {
      if (error.code === 11000)
        throw new ConflictException(message ?? 'Duplicated value in database');
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Throw Internal Error
   *
   * Function to abstract throwing internal server exception
   */
  public async throwInternalError<T>(promise: Promise<T>): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
