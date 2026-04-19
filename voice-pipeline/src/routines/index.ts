import { codeReviewHandler } from "./code_review";
import { probeHandler } from "./probe";
import { specToDesignHandler } from "./spec_to_design";
import { RoutineHandler, RoutineType } from "../types";

export const ROUTINE_REGISTRY: Record<RoutineType, RoutineHandler> = {
  code_review: codeReviewHandler,
  probe: probeHandler,
  spec_to_design: specToDesignHandler,
};
