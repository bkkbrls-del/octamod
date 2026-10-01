export const USAGE_EVENTS = ['page_view', 'configuration_started', 'build_succeeded', 'firmware_download_requested', 'configuration_exported'] as const
export type UsageEvent = typeof USAGE_EVENTS[number]
export type UsageDay = { day: string; visitors: number; page_views: number; configurations: number; builds: number; downloads: number; exports: number }
export type UsageStatistics = { generatedAt: string; collectionStarted: string | null; from: string; to: string; days: number; rows: UsageDay[] }
