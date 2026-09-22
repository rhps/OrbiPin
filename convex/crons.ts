// Spec 06: scheduled crons — crawl feeds every 30 min, extract after each
// crawl, archive stale events nightly.
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("crawl-and-extract", { minutes: 30 }, internal.crawl.crawlAllFeeds, {});
crons.daily("archive-stale", { hourUTC: 3, minuteUTC: 0 }, internal.events.archiveStale, {});

export default crons;
