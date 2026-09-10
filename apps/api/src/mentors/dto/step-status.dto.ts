import { IsIn } from "class-validator";

export class UpdateStepStatusDto {
  @IsIn(["todo", "in_progress", "done"])
  status!: "todo" | "in_progress" | "done";
}
