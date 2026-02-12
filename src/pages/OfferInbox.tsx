import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { StatusPill } from '@/components/StatusPill'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Inbox, Upload, FileText, Sparkles } from 'lucide-react'
import type { OfferWithRelations } from '@/types'
import type { OfferStatus } from '@/types/database'

export function OfferInbox() {
  const { orgId, canEdit } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [pasteValue, setPasteValue] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['offers', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id, status, source_type, raw_content, parsed_json, valid_until, lead_time_days, created_at,
          vendor:vendors(id, name, email)
        `)
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as OfferWithRelations[]
    },
    enabled: !!orgId,
  })

  const createOffer = useMutation({
    mutationFn: async (payload: {
      raw_content: string
      source_type: 'email' | 'manual'
      parsed_json?: unknown
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('offers')
        .insert({
          org_id: orgId!,
          status: 'new',
          source_type: payload.source_type,
          raw_content: payload.raw_content,
          parsed_json: payload.parsed_json ?? null,
          created_by: user?.id ?? null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['offers', orgId] })
      navigate(`/offers/${data.id}/review`)
    },
  })

  const parseWithAi = useMutation({
    mutationFn: async (offerId: string) => {
      const { data, error } = await supabase.functions.invoke('parse-offer-email', {
        body: { offer_id: offerId },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', orgId] })
    },
  })

  const handlePasteAndParse = async () => {
    const text = pasteValue.trim()
    if (!text || !canEdit) return
    const result = await createOffer.mutateAsync({
      raw_content: text,
      source_type: 'email',
    })
    parseWithAi.mutate(result.id)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orgId || !canEdit) return
    setUploading(true)
    try {
      const bucket = 'documents'
      const path = `${orgId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (uploadError) throw uploadError

      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          org_id: orgId,
          bucket,
          path,
          filename: file.name,
          content_type: file.type,
          size_bytes: file.size,
        })
        .select('id')
        .single()
      if (docError) throw docError

      const text = await file.text().catch(() => '')
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .insert({
          org_id: orgId,
          status: 'new',
          source_type: file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'excel' : 'email',
          raw_content: text || null,
          document_id: doc.id,
          created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
        })
        .select('id')
        .single()
      if (offerError) throw offerError

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const { data: excelData, error: excelErr } = await supabase.functions.invoke('import-excel-offer', {
          body: { offer_id: offer.id, document_id: doc.id },
        })
        if (!excelErr && excelData?.error) throw new Error(excelData.error)
      } else {
        parseWithAi.mutate(offer.id)
      }
      queryClient.invalidateQueries({ queryKey: ['offers', orgId] })
      navigate(`/offers/${offer.id}/review`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Offer Inbox</h1>
        <p className="mt-1 text-surface-500">Paste vendor emails or upload files — we’ll extract offers with AI.</p>
      </div>

      {canEdit && (
        <div className="mb-8 space-y-4">
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <label className="block text-sm font-medium text-slate-700">Paste email content</label>
            <textarea
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              placeholder="Paste vendor email with pricing and terms here…"
              rows={4}
              className="mt-2 w-full rounded-lg border border-surface-200 px-4 py-3 text-sm placeholder-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePasteAndParse}
                disabled={!pasteValue.trim() || createOffer.isPending || parseWithAi.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {(createOffer.isPending || parseWithAi.isPending) ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Parse with AI
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".eml,.txt,.pdf,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-surface-50 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                Upload .eml / .txt / .xlsx
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-surface-200 bg-white">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : offers.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No offers yet"
            description="Paste an email or upload a file to extract offers with AI."
            action={canEdit && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Upload file
              </button>
            )}
          />
        ) : (
          <ul className="divide-y divide-surface-100">
            {offers.map((offer) => (
              <li key={offer.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/offers/${offer.id}/review`)}
                  className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-surface-50 sm:px-6"
                >
                  <div className="rounded-lg bg-surface-100 p-2">
                    <FileText className="h-5 w-5 text-surface-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">
                      {(offer.parsed_json as { vendor_name?: string })?.vendor_name ?? offer.vendor?.name ?? 'Untitled offer'}
                    </p>
                    <p className="text-sm text-surface-500">
                      {offer.source_type} · {new Date(offer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusPill status={offer.status as OfferStatus} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
