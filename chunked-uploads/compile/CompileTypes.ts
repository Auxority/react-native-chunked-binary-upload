export interface CompileResponse {
  status: boolean
  missing_chunks: string[]
  file?: string
}
