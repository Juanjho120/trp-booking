"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Save,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  AdminPropertyPhoto,
  AdminPropertyPhotoErrorCode,
  AdminPropertyPhotoSettings,
  AdminPropertyPhotoUploadSignature,
} from "@/types/admin-property-photos";

import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

const textareaClassName =
  "min-h-24 w-full resize-y rounded-2xl border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

type AltDraft = Readonly<{
  altTextEs: string;
  altTextEn: string;
}>;

type PropertyPhotoApiResponse = Readonly<{
  settings?: AdminPropertyPhotoSettings;
  upload?: AdminPropertyPhotoUploadSignature;
  error?: Readonly<{
    code?: AdminPropertyPhotoErrorCode;
  }>;
}>;

type CloudinaryUploadResponse = Readonly<{
  public_id?: string;
}>;

function buildAltDrafts(
  settings: AdminPropertyPhotoSettings,
): Record<string, AltDraft> {
  return Object.fromEntries(
    settings.photos.map((photo) => [
      photo.id,
      {
        altTextEs: photo.altTextEs,
        altTextEn: photo.altTextEn,
      },
    ]),
  );
}

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminPropertyPhotoManager({
  initialSettings,
}: Readonly<{
  initialSettings: AdminPropertyPhotoSettings;
}>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.accommodations.photos;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] =
    useState<AdminPropertyPhotoSettings>(initialSettings);
  const [altDrafts, setAltDrafts] = useState<Record<string, AltDraft>>(() =>
    buildAltDrafts(initialSettings),
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState<
    string | null
  >(null);
  const [uploadAltTextEs, setUploadAltTextEs] = useState("");
  const [uploadAltTextEn, setUploadAltTextEn] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPropertyPhoto | null>(
    null,
  );
  const propertyName =
    locale === "en" ? settings.property.nameEn : settings.property.nameEs;
  const uploadDisabled = settings.photos.length >= settings.maxPhotos;
  const isBusy = busyKey !== null;

  useEffect(() => {
    if (!selectedFile) {
      setSelectedFilePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedFile);
    setSelectedFilePreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedFile]);

  function errorMessage(
    code: AdminPropertyPhotoErrorCode | undefined,
  ): string {
    return code
      ? copy.errors[code] ?? copy.errors.PROPERTY_PHOTO_UNEXPECTED_ERROR
      : copy.errors.PROPERTY_PHOTO_UNEXPECTED_ERROR;
  }

  function clearFeedback(): void {
    setErrorFeedback(null);
    setSuccessFeedback(null);
  }

  function applySettings(nextSettings: AdminPropertyPhotoSettings): void {
    setSettings(nextSettings);
    setAltDrafts(buildAltDrafts(nextSettings));
  }

  function updateAltDraft(
    imageId: string,
    field: keyof AltDraft,
    value: string,
  ): void {
    setAltDrafts((current) => ({
      ...current,
      [imageId]: {
        ...(current[imageId] ?? {
          altTextEs: "",
          altTextEn: "",
        }),
        [field]: value,
      },
    }));
  }

  async function readApiResponse(
    response: Response,
  ): Promise<PropertyPhotoApiResponse> {
    try {
      return (await response.json()) as PropertyPhotoApiResponse;
    } catch {
      return {};
    }
  }

  async function executeSettingsMutation(
    key: string,
    method: "PATCH" | "DELETE",
    body: unknown,
    successMessage: string,
  ): Promise<boolean> {
    setBusyKey(key);
    clearFeedback();

    try {
      const response = await fetch("/api/admin/property-photos", {
        method,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = await readApiResponse(response);

      if (!response.ok || !payload.settings) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return false;
      }

      applySettings(payload.settings);
      setSuccessFeedback(successMessage);
      return true;
    } catch {
      setErrorFeedback(copy.errors.PROPERTY_PHOTO_UNEXPECTED_ERROR);
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function uploadPhoto(): Promise<void> {
    if (!selectedFile) {
      setErrorFeedback(copy.errors.INVALID_PROPERTY_PHOTO_REQUEST);
      return;
    }

    if (!settings.acceptedMimeTypes.includes(selectedFile.type)) {
      setErrorFeedback(copy.errors.PROPERTY_PHOTO_UNSUPPORTED_TYPE);
      return;
    }

    if (selectedFile.size > settings.maxFileSizeBytes) {
      setErrorFeedback(copy.errors.PROPERTY_PHOTO_FILE_TOO_LARGE);
      return;
    }

    setBusyKey("upload");
    clearFeedback();

    try {
      const prepareResponse = await fetch("/api/admin/property-photos", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "prepare-upload",
          propertyId: settings.property.id,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          fileSize: selectedFile.size,
          altTextEs: uploadAltTextEs,
          altTextEn: uploadAltTextEn,
        }),
      });
      const preparePayload = await readApiResponse(prepareResponse);

      if (!prepareResponse.ok || !preparePayload.upload) {
        setErrorFeedback(errorMessage(preparePayload.error?.code));
        return;
      }

      const providerForm = new FormData();
      providerForm.set("file", selectedFile);
      providerForm.set("api_key", preparePayload.upload.apiKey);
      providerForm.set("timestamp", String(preparePayload.upload.timestamp));
      providerForm.set("signature", preparePayload.upload.signature);
      providerForm.set("public_id", preparePayload.upload.publicId);
      providerForm.set("overwrite", String(preparePayload.upload.overwrite));

      const providerResponse = await fetch(preparePayload.upload.uploadUrl, {
        method: "POST",
        body: providerForm,
      });
      let providerPayload: CloudinaryUploadResponse = {};

      try {
        providerPayload =
          (await providerResponse.json()) as CloudinaryUploadResponse;
      } catch {
        providerPayload = {};
      }

      if (
        !providerResponse.ok ||
        providerPayload.public_id !== preparePayload.upload.publicId
      ) {
        setErrorFeedback(copy.errors.PROPERTY_PHOTO_PROVIDER_ERROR);
        return;
      }

      const finalizeResponse = await fetch("/api/admin/property-photos", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "finalize-upload",
          propertyId: settings.property.id,
          publicId: preparePayload.upload.publicId,
          altTextEs: uploadAltTextEs,
          altTextEn: uploadAltTextEn,
        }),
      });
      const finalizePayload = await readApiResponse(finalizeResponse);

      if (!finalizeResponse.ok || !finalizePayload.settings) {
        setErrorFeedback(errorMessage(finalizePayload.error?.code));
        return;
      }

      applySettings(finalizePayload.settings);
      setSelectedFile(null);
      setUploadAltTextEs("");
      setUploadAltTextEn("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSuccessFeedback(copy.success.photoUploaded);
    } catch {
      setErrorFeedback(copy.errors.PROPERTY_PHOTO_PROVIDER_ERROR);
    } finally {
      setBusyKey(null);
    }
  }

  async function saveAltText(photo: AdminPropertyPhoto): Promise<void> {
    const draft = altDrafts[photo.id];

    if (!draft) {
      setErrorFeedback(copy.errors.INVALID_PROPERTY_PHOTO_REQUEST);
      return;
    }

    await executeSettingsMutation(
      `alt:${photo.id}`,
      "PATCH",
      {
        action: "update-alt",
        propertyId: settings.property.id,
        imageId: photo.id,
        expectedUpdatedAt: photo.updatedAt,
        altTextEs: draft.altTextEs,
        altTextEn: draft.altTextEn,
      },
      copy.success.altTextSaved,
    );
  }

  async function movePhoto(photoIndex: number, direction: -1 | 1) {
    const targetIndex = photoIndex + direction;

    if (targetIndex < 0 || targetIndex >= settings.photos.length) {
      return;
    }

    const orderedImageIds = settings.photos.map((photo) => photo.id);
    const currentId = orderedImageIds[photoIndex];
    const targetId = orderedImageIds[targetIndex];

    if (!currentId || !targetId) {
      return;
    }

    orderedImageIds[photoIndex] = targetId;
    orderedImageIds[targetIndex] = currentId;

    await executeSettingsMutation(
      `order:${currentId}`,
      "PATCH",
      {
        action: "reorder",
        propertyId: settings.property.id,
        expectedRevision: settings.revision,
        orderedImageIds,
      },
      copy.success.orderSaved,
    );
  }

  async function setCover(photo: AdminPropertyPhoto): Promise<void> {
    await executeSettingsMutation(
      `cover:${photo.id}`,
      "PATCH",
      {
        action: "set-cover",
        propertyId: settings.property.id,
        imageId: photo.id,
        expectedRevision: settings.revision,
      },
      copy.success.coverSaved,
    );
  }

  async function deletePhoto(): Promise<void> {
    if (!deleteTarget) {
      return;
    }

    const deleted = await executeSettingsMutation(
      `delete:${deleteTarget.id}`,
      "DELETE",
      {
        propertyId: settings.property.id,
        imageId: deleteTarget.id,
        expectedRevision: settings.revision,
      },
      copy.success.photoDeleted,
    );

    if (deleted) {
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild className="rounded-full" variant="outline">
              <Link href="/admin/accommodations">
                <ArrowLeft aria-hidden="true" />
                {copy.actions.backToAccommodations}
              </Link>
            </Button>
            <Button asChild className="rounded-full" variant="secondary">
              <Link href={`/admin/accommodations/${settings.property.id}`}>
                {copy.actions.backToContent}
              </Link>
            </Button>
          </div>
        }
        badge={copy.badge}
        description={copy.description}
        title={`${copy.title}: ${propertyName}`}
      />

      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={errorFeedback ?? successFeedback}
        onDismiss={clearFeedback}
        variant={errorFeedback ? "error" : "success"}
      />

      <Card className="mb-8 border-border/70 bg-card shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>{copy.sections.upload}</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                {copy.notes.formats}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {copy.labels.currentCount}: {settings.photos.length} / {settings.maxPhotos}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-5 lg:grid-cols-2"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void uploadPhoto();
            }}
          >
            <div className="grid gap-3 lg:col-span-2">
              <input
                accept={settings.acceptedMimeTypes.join(",")}
                className="sr-only"
                disabled={isBusy || uploadDisabled}
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
                ref={fileInputRef}
                type="file"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={isBusy || uploadDisabled}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  variant="outline"
                >
                  <ImagePlus aria-hidden="true" />
                  {copy.actions.chooseFile}
                </Button>
                <p className="min-w-0 break-all text-sm text-muted-foreground">
                  {selectedFile
                    ? `${selectedFile.name} · ${formatFileSize(selectedFile.size)}`
                    : copy.labels.noFileSelected}
                </p>
              </div>

              {selectedFilePreviewUrl ? (
                <div className="grid gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {copy.labels.preview}
                  </p>
                  <div className="relative aspect-[16/10] w-full max-w-2xl overflow-hidden rounded-2xl border border-border/70 bg-muted">
                    <Image
                      alt={copy.labels.previewAlt}
                      className="object-contain"
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      src={selectedFilePreviewUrl}
                      unoptimized
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <label className="grid gap-2 text-sm font-medium">
              {copy.labels.altTextEs}
              <textarea
                className={textareaClassName}
                disabled={isBusy || uploadDisabled}
                maxLength={250}
                minLength={3}
                onChange={(event) => setUploadAltTextEs(event.target.value)}
                required
                value={uploadAltTextEs}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              {copy.labels.altTextEn}
              <textarea
                className={textareaClassName}
                disabled={isBusy || uploadDisabled}
                maxLength={250}
                minLength={3}
                onChange={(event) => setUploadAltTextEn(event.target.value)}
                required
                value={uploadAltTextEn}
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
              <p className="text-xs leading-5 text-muted-foreground">
                {copy.notes.altText}
              </p>
              <Button
                disabled={
                  isBusy ||
                  uploadDisabled ||
                  !selectedFile ||
                  !uploadAltTextEs.trim() ||
                  !uploadAltTextEn.trim()
                }
                type="submit"
              >
                {busyKey === "upload" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <Upload aria-hidden="true" />
                )}
                {busyKey === "upload"
                  ? copy.actions.uploading
                  : copy.actions.upload}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="property-photo-list-heading">
        <div className="mb-5">
          <h2
            className="text-2xl font-semibold tracking-tight"
            id="property-photo-list-heading"
          >
            {copy.sections.current}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {copy.notes.order}
          </p>
        </div>

        {settings.photos.length > 0 ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {settings.photos.map((photo, index) => {
              const draft = altDrafts[photo.id] ?? {
                altTextEs: photo.altTextEs,
                altTextEn: photo.altTextEn,
              };
              const altDirty =
                draft.altTextEs !== photo.altTextEs ||
                draft.altTextEn !== photo.altTextEn;

              return (
                <Card
                  className="overflow-hidden border-border/70 bg-card shadow-sm"
                  key={photo.id}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <Image
                      alt={locale === "en" ? photo.altTextEn : photo.altTextEs}
                      className="object-cover"
                      fill
                      sizes="(min-width: 1280px) 50vw, 100vw"
                      src={photo.src}
                    />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {copy.labels.order}: {index + 1}
                      </Badge>
                      {photo.isCover ? (
                        <Badge>
                          <Star aria-hidden="true" className="size-3" />
                          {copy.labels.cover}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <CardContent className="space-y-5 pt-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium">
                        {copy.labels.altTextEs}
                        <textarea
                          className={textareaClassName}
                          disabled={isBusy}
                          maxLength={250}
                          minLength={3}
                          onChange={(event) =>
                            updateAltDraft(
                              photo.id,
                              "altTextEs",
                              event.target.value,
                            )
                          }
                          required
                          value={draft.altTextEs}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        {copy.labels.altTextEn}
                        <textarea
                          className={textareaClassName}
                          disabled={isBusy}
                          maxLength={250}
                          minLength={3}
                          onChange={(event) =>
                            updateAltDraft(
                              photo.id,
                              "altTextEn",
                              event.target.value,
                            )
                          }
                          required
                          value={draft.altTextEn}
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={isBusy || index === 0}
                        onClick={() => void movePhoto(index, -1)}
                        type="button"
                        variant="outline"
                      >
                        <ChevronUp aria-hidden="true" />
                        {copy.actions.moveUp}
                      </Button>
                      <Button
                        disabled={isBusy || index === settings.photos.length - 1}
                        onClick={() => void movePhoto(index, 1)}
                        type="button"
                        variant="outline"
                      >
                        <ChevronDown aria-hidden="true" />
                        {copy.actions.moveDown}
                      </Button>
                      <Button
                        disabled={isBusy || photo.isCover}
                        onClick={() => void setCover(photo)}
                        type="button"
                        variant="secondary"
                      >
                        <Star aria-hidden="true" />
                        {copy.actions.setCover}
                      </Button>
                      <Button
                        disabled={isBusy || !altDirty}
                        onClick={() => void saveAltText(photo)}
                        type="button"
                      >
                        {busyKey === `alt:${photo.id}` ? (
                          <Loader2 aria-hidden="true" className="animate-spin" />
                        ) : (
                          <Save aria-hidden="true" />
                        )}
                        {copy.actions.saveAltText}
                      </Button>
                      <Button
                        disabled={isBusy}
                        onClick={() => setDeleteTarget(photo)}
                        type="button"
                        variant="destructive"
                      >
                        <Trash2 aria-hidden="true" />
                        {copy.actions.delete}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed bg-muted/20 shadow-none">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {copy.empty.noPhotos}
            </CardContent>
          </Card>
        )}
      </section>

      <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
        {copy.notes.softDelete}
      </div>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !isBusy) {
            setDeleteTarget(null);
          }
        }}
        open={deleteTarget !== null}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>{copy.deleteDialog.title}</SheetTitle>
            <SheetDescription>
              {copy.deleteDialog.description}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 text-sm leading-6 text-muted-foreground">
            {deleteTarget
              ? locale === "en"
                ? deleteTarget.altTextEn
                : deleteTarget.altTextEs
              : null}
          </div>
          <SheetFooter>
            <Button
              disabled={isBusy}
              onClick={() => setDeleteTarget(null)}
              type="button"
              variant="outline"
            >
              {copy.actions.cancel}
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => void deletePhoto()}
              type="button"
              variant="destructive"
            >
              {deleteTarget && busyKey === `delete:${deleteTarget.id}` ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              {copy.actions.confirmDelete}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
