import { Role } from "@prisma/client";

export class Stall {
  constructor(
    public id: string,
    public username: string,
    public password: string,
    public role: Role,
    public stall: Stall,
    public createdAt: string
  ) {}
}
