import type { HealthCheck } from "../types";
import { diskCheck } from "./disk";
import { memoryCheck } from "./memory";
import { servicesCheck } from "./services";
import { sslCheck } from "./ssl";

/**
 * Default set of health checks. Adding a new check = drop a file here
 * and append to this array.
 */
export const DEFAULT_HEALTH_CHECKS: HealthCheck[] = [
  diskCheck,
  memoryCheck,
  servicesCheck,
  sslCheck,
];
