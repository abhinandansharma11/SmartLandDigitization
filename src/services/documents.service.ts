// ==========================================
// BhoomiAI - Documents Service (Mock)
// ==========================================

import { delay } from './api-client';
import { UploadedDocument, ExtractionResult, ProcessingPipelineStep } from '../types/documents';
import { MOCK_DOCUMENTS, MOCK_EXTRACTION_RESULT, MOCK_EXTRACTION_HIGH_CONFIDENCE, createProcessingPipeline } from '../data/mock-documents';

export const documentsService = {
  async getDocuments(): Promise<UploadedDocument[]> {
    await delay(400);
    return [...MOCK_DOCUMENTS];
  },

  async getDocument(id: string): Promise<UploadedDocument | null> {
    await delay(300);
    return MOCK_DOCUMENTS.find(d => d.id === id) || null;
  },

  async uploadDocument(_file: File, _metadata: Record<string, string>): Promise<UploadedDocument> {
    await delay(1500);
    return {
      id: `doc-${Date.now()}`,
      fileName: _file.name,
      fileType: _file.name.split('.').pop() as UploadedDocument['fileType'],
      fileSize: _file.size,
      documentType: 'other',
      metadata: {
        state: _metadata.state || '',
        district: _metadata.district || '',
        tehsil: _metadata.tehsil || '',
        village: _metadata.village || '',
        documentType: 'other',
        recordYear: _metadata.recordYear || '',
        sourceDepartment: _metadata.sourceDepartment || '',
      },
      processingStatus: 'uploaded',
      processingProgress: 0,
      uploadedBy: 'current-user',
      uploadedAt: new Date().toISOString(),
    };
  },

  async getProcessingStatus(documentId: string): Promise<{ status: string; progress: number; pipeline: ProcessingPipelineStep[] }> {
    await delay(300);
    const doc = MOCK_DOCUMENTS.find(d => d.id === documentId);
    return {
      status: doc?.processingStatus || 'uploaded',
      progress: doc?.processingProgress || 0,
      pipeline: createProcessingPipeline(doc?.processingStatus || 'uploaded'),
    };
  },

  async getExtractionResult(documentId: string): Promise<ExtractionResult> {
    await delay(500);
    if (documentId === 'doc-001') return MOCK_EXTRACTION_HIGH_CONFIDENCE;
    return MOCK_EXTRACTION_RESULT;
  },

  async startProcessing(_documentId: string): Promise<void> {
    await delay(500);
  },
};
