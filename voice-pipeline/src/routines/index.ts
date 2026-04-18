import { codeReviewHandler } from "./code_review";
import { RoutineHandler, RoutineType } from "../types";

export const ROUTINE_REGISTRY: Record<RoutineType, RoutineHandler> = {
  code_review: codeReviewHandler,
};
