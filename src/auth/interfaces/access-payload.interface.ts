export interface IAccessPayload {
  id: string;
}

export interface IAccessPayloadResponse extends IAccessPayload {
  iat: number;
  exp: number;
}
