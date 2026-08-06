"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Braces,
  Clock3,
  History,
  Loader2,
  Play,
  TimerReset,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLocale } from "@/features/i18n";
import type {
  AdminCronJobRunApiResponse,
  AdminCronJobsPageData,
  AdminCronJobSummary,
} from "@/types/admin-cron-job";
import type {
  CronJobExecutionSnapshot,
  CronJobExecutionStatusValue,
  CronJobKeyValue,
  CronJobTriggerSourceValue,
} from "@/types/cron-job";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

type CronJobCopy = ReturnType<typeof useLocale>["messages"]["admin"]["cronJobs"];

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function buildPageHref(page: number): string {
  return page <= 1 ? "/admin/cron-jobs" : `/admin/cron-jobs?page=${page}`;
}

export function AdminCronJobsPage({
  data,
}: Readonly<{ data: AdminCronJobsPageData }>) {
  const router = useRouter();
  const { locale, messages } = useLocale();
  const copy = messages.admin.cronJobs;
  const intlLocale = getIntlLocale(locale);
  const [selectedJob, setSelectedJob] = useState<AdminCronJobSummary | null>(
    null,
  );
  const [runningJobSlug, setRunningJobSlug] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const isBusy = runningJobSlug !== null;

  function clearFeedback(): void {
    setSuccessFeedback(null);
    setErrorFeedback(null);
  }

  function formatDateTime(value: string | null): string {
    if (!value) {
      return copy.labels.unavailable;
    }

    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function formatDuration(value: number | null): string {
    if (value === null) {
      return copy.labels.unavailable;
    }

    if (value < 1_000) {
      return new Intl.NumberFormat(intlLocale, {
        style: "unit",
        unit: "millisecond",
        unitDisplay: "short",
      }).format(value);
    }

    return new Intl.NumberFormat(intlLocale, {
      maximumFractionDigits: value < 10_000 ? 1 : 0,
      style: "unit",
      unit: "second",
      unitDisplay: "short",
    }).format(value / 1_000);
  }

  function jobCopy(jobKey: CronJobKeyValue) {
    return copy.jobs[jobKey];
  }

  function statusLabel(status: CronJobExecutionStatusValue): string {
    return copy.statuses[status];
  }

  function triggerLabel(trigger: CronJobTriggerSourceValue): string {
    return copy.triggers[trigger];
  }

  function safeErrorMessage(execution: CronJobExecutionSnapshot): string {
    if (!execution.errorCode) {
      return copy.labels.unavailable;
    }

    const localizedMessages: Readonly<Record<string, string>> =
      copy.safeErrorMessages;

    return (
      localizedMessages[execution.errorCode] ??
      copy.errors.ADMIN_CRON_JOB_UNEXPECTED_ERROR
    );
  }

  function runErrorMessage(payload: AdminCronJobRunApiResponse): string {
    if (!("error" in payload)) {
      return copy.errors.ADMIN_CRON_JOB_UNEXPECTED_ERROR;
    }

    return copy.errors[payload.error.code];
  }

  async function confirmRun(): Promise<void> {
    if (!selectedJob || isBusy) {
      return;
    }

    clearFeedback();
    setRunningJobSlug(selectedJob.slug);

    try {
      const response = await fetch(
        `/api/admin/cron-jobs/${encodeURIComponent(selectedJob.slug)}/run`,
        {
          method: "POST",
          headers: { accept: "application/json" },
        },
      );
      const payload = (await response.json()) as AdminCronJobRunApiResponse;

      if (!response.ok || !("execution" in payload)) {
        setErrorFeedback(runErrorMessage(payload));
        return;
      }

      if (payload.execution.status === "FAILED") {
        setErrorFeedback(copy.feedback.failed);
      } else if (payload.execution.status === "PARTIAL_SUCCESS") {
        setSuccessFeedback(copy.feedback.partialSuccess);
      } else {
        setSuccessFeedback(copy.feedback.success);
      }

      setSelectedJob(null);
      router.refresh();
    } catch {
      setErrorFeedback(copy.errors.ADMIN_CRON_JOB_UNEXPECTED_ERROR);
    } finally {
      setRunningJobSlug(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        badge={copy.badge}
        description={copy.description}
        title={copy.title}
      />

      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={errorFeedback ?? successFeedback}
        onDismiss={clearFeedback}
        variant={errorFeedback ? "error" : "success"}
      />

      <section
        aria-label={copy.sections.registeredJobs}
        className="mt-6 grid gap-4 lg:grid-cols-2"
      >
        {data.jobs.map((job) => (
          <CronJobCard
            copy={copy}
            formatDateTime={formatDateTime}
            formatDuration={formatDuration}
            isBusy={isBusy}
            job={job}
            jobDescription={jobCopy(job.key).description}
            jobTitle={jobCopy(job.key).title}
            key={job.key}
            onRun={() => {
              clearFeedback();
              setSelectedJob(job);
            }}
            statusLabel={statusLabel}
          />
        ))}
      </section>

      <Card className="mt-6 border-border/70 bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <History aria-hidden="true" className="size-5" />
            </span>
            <div>
              <CardTitle>{copy.sections.executionHistory}</CardTitle>
              <CardDescription className="mt-1">
                {copy.historyDescription}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.executions.length > 0 ? (
            <>
              <Accordion className="grid gap-3" collapsible type="single">
                {data.executions.map((execution) => (
                  <ExecutionItem
                    copy={copy}
                    execution={execution}
                    formatDateTime={formatDateTime}
                    formatDuration={formatDuration}
                    jobTitle={jobCopy(execution.jobKey).title}
                    key={execution.id}
                    safeErrorMessage={safeErrorMessage}
                    statusLabel={statusLabel}
                    triggerLabel={triggerLabel}
                  />
                ))}
              </Accordion>

              <div className="mt-6 flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {copy.pagination.page} {data.pagination.page}{" "}
                  {copy.pagination.of} {data.pagination.totalPages} ·{" "}
                  {data.pagination.totalItems}{" "}
                  {copy.pagination.results}
                </p>
                <div className="flex gap-2">
                  <Button
                    asChild={data.pagination.page > 1}
                    disabled={data.pagination.page <= 1}
                    variant="outline"
                  >
                    {data.pagination.page > 1 ? (
                      <Link href={buildPageHref(data.pagination.page - 1)}>
                        {copy.actions.previous}
                      </Link>
                    ) : (
                      <span>{copy.actions.previous}</span>
                    )}
                  </Button>
                  <Button
                    asChild={data.pagination.page < data.pagination.totalPages}
                    disabled={
                      data.pagination.page >= data.pagination.totalPages
                    }
                    variant="outline"
                  >
                    {data.pagination.page < data.pagination.totalPages ? (
                      <Link href={buildPageHref(data.pagination.page + 1)}>
                        {copy.actions.next}
                      </Link>
                    ) : (
                      <span>{copy.actions.next}</span>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
              {copy.empty.history}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet
        onOpenChange={(open: boolean) => {
          if (!open && !isBusy) {
            setSelectedJob(null);
          }
        }}
        open={selectedJob !== null}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>{copy.dialog.title}</SheetTitle>
            <SheetDescription>{copy.dialog.description}</SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 overflow-y-auto px-6 py-2 text-sm leading-6">
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="font-semibold">
                {selectedJob ? jobCopy(selectedJob.key).title : ""}
              </p>
              <p className="mt-2 text-muted-foreground">
                {selectedJob ? jobCopy(selectedJob.key).description : ""}
              </p>
              <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                {copy.labels.schedule}
              </p>
              <p className="font-mono text-sm">{selectedJob?.schedule}</p>
            </div>
            <p className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-foreground">
              {copy.dialog.auditNote}
            </p>
            <p className="text-muted-foreground">{copy.dialog.overlapNote}</p>
          </div>

          <SheetFooter>
            <Button
              disabled={isBusy}
              onClick={() => setSelectedJob(null)}
              type="button"
              variant="outline"
            >
              {copy.actions.cancel}
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => void confirmRun()}
              type="button"
            >
              {isBusy ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Play aria-hidden="true" />
              )}
              {isBusy ? copy.actions.running : copy.actions.confirmRun}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function CronJobCard({
  job,
  jobTitle,
  jobDescription,
  copy,
  isBusy,
  onRun,
  formatDateTime,
  formatDuration,
  statusLabel,
}: Readonly<{
  job: AdminCronJobSummary;
  jobTitle: string;
  jobDescription: string;
  copy: CronJobCopy;
  isBusy: boolean;
  onRun: () => void;
  formatDateTime: (value: string | null) => string;
  formatDuration: (value: number | null) => string;
  statusLabel: (status: CronJobExecutionStatusValue) => string;
}>) {
  const latest = job.latestExecution;

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <TimerReset aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <CardTitle>{jobTitle}</CardTitle>
              <CardDescription className="mt-1">
                {jobDescription}
              </CardDescription>
            </div>
          </div>

          <Badge
            className="w-fit sm:justify-self-end"
            variant="outline"
          >
            {latest ? statusLabel(latest.status) : copy.statuses.NEVER_RUN}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryValue
            icon={<Clock3 aria-hidden="true" className="size-4" />}
            label={copy.labels.schedule}
            value={job.schedule}
          />
          <SummaryValue
            icon={<History aria-hidden="true" className="size-4" />}
            label={copy.labels.latestExecution}
            value={formatDateTime(latest?.startedAt ?? null)}
          />
          <SummaryValue
            icon={<TimerReset aria-hidden="true" className="size-4" />}
            label={copy.labels.duration}
            value={formatDuration(latest?.durationMs ?? null)}
          />
        </div>
        <Button
          className="w-full sm:w-fit"
          disabled={isBusy || job.isRunning}
          onClick={onRun}
          type="button"
        >
          {job.isRunning ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Play aria-hidden="true" />
          )}
          {job.isRunning ? copy.actions.running : copy.actions.runNow}
        </Button>
      </CardContent>
    </Card>
  );
}

function ExecutionItem({
  execution,
  jobTitle,
  copy,
  formatDateTime,
  formatDuration,
  safeErrorMessage,
  statusLabel,
  triggerLabel,
}: Readonly<{
  execution: CronJobExecutionSnapshot;
  jobTitle: string;
  copy: CronJobCopy;
  formatDateTime: (value: string | null) => string;
  formatDuration: (value: number | null) => string;
  safeErrorMessage: (execution: CronJobExecutionSnapshot) => string;
  statusLabel: (status: CronJobExecutionStatusValue) => string;
  triggerLabel: (trigger: CronJobTriggerSourceValue) => string;
}>) {
  const actor = execution.adminActor
    ? execution.adminActor.name
      ? `${execution.adminActor.name} · ${execution.adminActor.email}`
      : execution.adminActor.email
    : copy.labels.systemActor;

  return (
    <AccordionItem
      className="overflow-hidden rounded-2xl border border-border bg-muted/20 last:border-b"
      value={execution.id}
    >
      <AccordionTrigger className="px-4 py-3 hover:bg-muted/40 sm:px-5">
        <div className="grid min-w-0 flex-1 gap-3 pr-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{jobTitle}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {execution.id}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(execution.startedAt)}
          </p>
          <Badge
            className="justify-self-start sm:justify-self-end"
            variant="outline"
          >
            {statusLabel(execution.status)}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="border-t border-border/70 px-4 pt-4 sm:px-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailValue
            label={copy.labels.trigger}
            value={triggerLabel(execution.triggerSource)}
          />
          <DetailValue
            label={copy.labels.environment}
            value={execution.businessEnvironment}
          />
          <DetailValue
            label={copy.labels.startedAt}
            value={formatDateTime(execution.startedAt)}
          />
          <DetailValue
            label={copy.labels.finishedAt}
            value={formatDateTime(execution.finishedAt)}
          />
          <DetailValue
            label={copy.labels.duration}
            value={formatDuration(execution.durationMs)}
          />
          <DetailValue label={copy.labels.actor} value={actor} />
          <DetailValue
            label={copy.labels.errorCode}
            value={execution.errorCode ?? copy.labels.unavailable}
          />
          <DetailValue
            label={copy.labels.errorMessage}
            value={safeErrorMessage(execution)}
          />
        </div>
        <div className="mt-5 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Braces aria-hidden="true" className="size-4 text-primary" />
            {copy.labels.normalizedResult}
          </div>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted/50 p-4 text-xs leading-5">
            {JSON.stringify(execution.result ?? {}, null, 2)}
          </pre>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function SummaryValue({
  icon,
  label,
  value,
}: Readonly<{
  icon: ReactNode;
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function DetailValue({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
