/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as alerts from "../alerts.js";
import type * as crawl from "../crawl.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as extract from "../extract.js";
import type * as followMutations from "../followMutations.js";
import type * as followers from "../followers.js";
import type * as geoLookup from "../geoLookup.js";
import type * as http from "../http.js";
import type * as inbound from "../inbound.js";
import type * as mapData from "../mapData.js";
import type * as places from "../places.js";
import type * as repair from "../repair.js";
import type * as reprocess from "../reprocess.js";
import type * as rss from "../rss.js";
import type * as search from "../search.js";
import type * as sources from "../sources.js";
import type * as verify from "../verify.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  alerts: typeof alerts;
  crawl: typeof crawl;
  crons: typeof crons;
  events: typeof events;
  extract: typeof extract;
  followMutations: typeof followMutations;
  followers: typeof followers;
  geoLookup: typeof geoLookup;
  http: typeof http;
  inbound: typeof inbound;
  mapData: typeof mapData;
  places: typeof places;
  repair: typeof repair;
  reprocess: typeof reprocess;
  rss: typeof rss;
  search: typeof search;
  sources: typeof sources;
  verify: typeof verify;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
