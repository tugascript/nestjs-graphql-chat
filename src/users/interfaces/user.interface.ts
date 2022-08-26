import { IBase } from '../../common/interfaces/base.interface';
import { OnlineStatusEnum } from '../enums/online-status.enum';

export interface IUser extends IBase {
  name: string;
  username: string;
  email: string;
  description?: string;
  onlineStatus: OnlineStatusEnum;
  lastOnline: Date;
}
