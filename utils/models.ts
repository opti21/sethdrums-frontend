import { Schema, model } from "mongoose";

export interface IMod {
  id?: string;
  username: string;
}

const modSchema = new Schema<IMod>({
  username: { type: String },
});

export const ModModel = model<IMod>("Mod", modSchema);
