"use server"

import { auth } from "@/auth"
import { tenantService, websiteService } from "@/lib/domain"
import type { WebsiteField, WebsiteFieldType } from "@/lib/domain/types"
import { logger } from "@/lib/logger"

function getBffApi(): { url: string; secret: string } | null {
  const url = process.env.CLOUDFLARE_INTERNAL_API_URL
  const secret = process.env.CLOUDFLARE_INTERNAL_API_SECRET
  if (!url || !secret) return null
  return { url, secret }
}

function parseUrl(raw: string): string {
  const trimmed = raw.trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error(`Invalid URL: ${trimmed}`)
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("URL must use http or https")
  }
  return parsed.origin
}

export async function addWebsite(formData: FormData): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const name = formData.get("name")
  const url = formData.get("url")

  if (typeof name !== "string" || name.trim().length === 0) return { error: "Name is required" }
  if (typeof url !== "string" || url.trim().length === 0) return { error: "URL is required" }

  let parsedUrl: string
  try {
    parsedUrl = parseUrl(url)
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid URL" }
  }

  const bffApi = getBffApi()
  if (!bffApi) {
    logger.error("addWebsite", "CLOUDFLARE_INTERNAL_API_URL or CLOUDFLARE_INTERNAL_API_SECRET is not configured")
    return { error: "API not configured" }
  }

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id)
    const res = await fetch(`${bffApi.url}/websites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bffApi.secret}`,
        "x-tenant-id": tenantId,
      },
      body: JSON.stringify({ name: name.trim(), url: parsedUrl }),
    })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      return { error: data.error ?? "Failed to add website" }
    }
    return {}
  } catch (e) {
    logger.error("addWebsite", e)
    return { error: "Failed to add website" }
  }
}

export async function updateWebsite(id: string, formData: FormData): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const name = formData.get("name")
  const url = formData.get("url")

  if (typeof name !== "string" || name.trim().length === 0) return { error: "Name is required" }
  if (typeof url !== "string" || url.trim().length === 0) return { error: "URL is required" }

  let parsedUrl: string
  try {
    parsedUrl = parseUrl(url)
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid URL" }
  }

  const regenerateKey = formData.get("regenerateKey") === "1"

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id)
    const result = await websiteService.updateWebsite(id, tenantId, {
      name: name.trim(),
      url: parsedUrl,
      regenerateKey,
    })
    if (!result) return { error: "Website not found" }
    return {}
  } catch (e) {
    logger.error("updateWebsite", e)
    return { error: "Failed to update website" }
  }
}

export async function deactivateWebsite(id: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id)
    const ok = await websiteService.deactivateWebsite(id, tenantId)
    if (!ok) return { error: "Website not found" }
    return {}
  } catch (e) {
    logger.error("deactivateWebsite", e)
    return { error: "Failed to deactivate website" }
  }
}

export async function getWebsiteFields(
  websiteId: string
): Promise<{ fields: WebsiteField[] } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const fields = await websiteService.getWebsiteFields(websiteId)
    return { fields }
  } catch (e) {
    logger.error("getWebsiteFields", e)
    return { error: "Failed to load fields" }
  }
}

export async function createWebsiteField(
  websiteId: string,
  data: { slug: string; label: string; type: WebsiteFieldType; required: boolean; position: number }
): Promise<{ field: WebsiteField } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id)
    const field = await websiteService.createWebsiteField(tenantId, { websiteId, ...data })
    if (!field) return { error: "Website not found" }
    return { field }
  } catch (e) {
    logger.error("createWebsiteField", e)
    return { error: "Failed to create field" }
  }
}

export async function updateWebsiteField(
  fieldId: string,
  data: { label?: string; type?: WebsiteFieldType; required?: boolean; position?: number }
): Promise<{ field: WebsiteField } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id)
    const field = await websiteService.updateWebsiteField(fieldId, tenantId, data)
    if (!field) return { error: "Field not found" }
    return { field }
  } catch (e) {
    logger.error("updateWebsiteField", e)
    return { error: "Failed to update field" }
  }
}

export async function deleteWebsiteField(fieldId: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id)
    const ok = await websiteService.deleteWebsiteField(fieldId, tenantId)
    if (!ok) return { error: "Field not found" }
    return {}
  } catch (e) {
    logger.error("deleteWebsiteField", e)
    return { error: "Failed to delete field" }
  }
}
