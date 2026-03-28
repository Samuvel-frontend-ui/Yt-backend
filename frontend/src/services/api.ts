import axios, { AxiosError } from 'axios';

/** Render API (used when not using same-origin `/api` proxy). */
const REMOTE_API_ORIGIN = 'https://yt-backend-ys8d.onrender.com';

/**
 * Empty → same-origin `/api/...` (Vite dev proxy or Vercel rewrite in `frontend/vercel.json`).
 * Set at build time: `vite.config` defines `__USE_RELATIVE_API__` from `process.env.VERCEL` (Vercel CI)
 * or `VITE_RELATIVE_API=1` for a custom domain / self-hosted static that proxies `/api`.
 */
const API_PREFIX = import.meta.env.DEV || __USE_RELATIVE_API__ ? '' : REMOTE_API_ORIGIN;

const videoInfoUrl = () => (API_PREFIX ? `${API_PREFIX}/api/video-info` : '/api/video-info');
const downloadStatusUrl = () => (API_PREFIX ? `${API_PREFIX}/api/download-status` : '/api/download-status');

const api = axios.create({
  timeout: 120_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  filesize?: number;
  quality: string;
  format_type?: 'video+audio' | 'video-only' | 'audio-only';
}

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  duration_string: string;
  uploader: string;
  formats: VideoFormat[];
}

export interface DownloadProgress {
  state: 'preparing' | 'downloading' | 'completed' | 'failed';
  percent?: number;
  speed?: string;
  eta?: string;
  error?: string;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ error?: string }>;
  const responseData = axiosError.response?.data as unknown;
  if (typeof responseData === 'string' && responseData.trim()) return responseData;
  if (responseData && typeof responseData === 'object') {
    const dataObj = responseData as { error?: unknown; message?: unknown; hint?: unknown };
    const hint = typeof dataObj.hint === 'string' && dataObj.hint.trim() ? ` ${dataObj.hint.trim()}` : '';
    if (typeof dataObj.error === 'string' && dataObj.error.trim()) return `${dataObj.error.trim()}${hint}`;
    if (typeof dataObj.message === 'string' && dataObj.message.trim()) return `${dataObj.message.trim()}${hint}`;
  }
  if (axiosError.response?.status === 405) {
    return (
      'HTTP 405: /api is not proxied to Render. Redeploy with root `frontend/vercel.json` (api rewrite) or hard refresh.'
    );
  }
  if (axiosError.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ECONNREFUSED')
    return 'Cannot reach the API. Check Render is up and Vercel rewrites /api to Render.';
  if (axiosError.code === 'ECONNRESET' || /ECONNRESET/i.test(String(axiosError.message)))
    return 'Connection was reset while talking to the API. Retry or wait if the API was cold-starting.';
  if (axiosError.message) return axiosError.message;
  return fallback;
}

export const videoService = {
  async fetchInfo(url: string): Promise<VideoInfo> {
    if (!url?.trim()) {
      throw new Error('URL is required');
    }

    try {
      const response = await api.post<VideoInfo>(videoInfoUrl(), { url: url.trim() });
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to fetch video info'));
    }
  },

  getDownloadUrl(url: string, formatId: string, opts?: { title?: string; kind?: 'video' | 'mp3'; requestId?: string }): string {
    const trimmedUrl = url?.trim();
    const trimmedFormat = formatId?.trim();

    if (!trimmedUrl) throw new Error('URL is required');
    if (!trimmedFormat) throw new Error('Format is required');

    const params = new URLSearchParams({
      url: trimmedUrl,
      format_id: trimmedFormat,
    });
    if (opts?.title?.trim()) params.set('title', opts.title.trim());
    if (opts?.kind) params.set('kind', opts.kind);
    if (opts?.requestId) params.set('request_id', opts.requestId);
    const base = API_PREFIX ? `${API_PREFIX}/api/download` : '/api/download';
    return `${base}?${params.toString()}`;
  },

  async fetchDownloadStatus(requestId: string): Promise<DownloadProgress> {
    const response = await api.get<DownloadProgress>(downloadStatusUrl(), { params: { request_id: requestId } });
    return response.data;
  },
};
