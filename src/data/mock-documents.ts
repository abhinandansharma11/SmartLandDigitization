// ==========================================
// BhoomiAI - Mock Documents & Extraction Data
// ==========================================

import { UploadedDocument, ExtractionResult, ExtractionField, ProcessingPipelineStep } from '../types/documents';

export const MOCK_DOCUMENTS: UploadedDocument[] = [
  {
    id: 'doc-001',
    fileName: 'Khasra_125_2_Rampur.pdf',
    fileType: 'pdf',
    fileSize: 2456000,
    documentType: 'khasra',
    metadata: {
      state: 'Uttar Pradesh',
      district: 'Amethi',
      tehsil: 'Gauriganj',
      village: 'Rampur',
      documentType: 'khasra',
      recordYear: '2018',
      sourceDepartment: 'Tehsil Revenue Office',
      description: 'Khasra record for Survey No. 125/2',
    },
    processingStatus: 'completed',
    processingProgress: 100,
    uploadedBy: 'usr-005',
    uploadedAt: '2026-07-15T10:00:00+05:30',
  },
  {
    id: 'doc-003',
    fileName: 'RoR_142_3_Semrauta.jpg',
    fileType: 'jpg',
    fileSize: 3200000,
    documentType: 'ror',
    metadata: {
      state: 'Uttar Pradesh',
      district: 'Amethi',
      tehsil: 'Gauriganj',
      village: 'Semrauta',
      documentType: 'ror',
      recordYear: '2022',
      sourceDepartment: 'Tehsil Revenue Office',
    },
    processingStatus: 'completed',
    processingProgress: 100,
    uploadedBy: 'usr-005',
    uploadedAt: '2026-08-01T09:00:00+05:30',
  },
  {
    id: 'doc-005',
    fileName: 'Legacy_89_4_Shivgarh.tiff',
    fileType: 'tiff',
    fileSize: 8900000,
    documentType: 'legacy_record',
    metadata: {
      state: 'Uttar Pradesh',
      district: 'Amethi',
      tehsil: 'Musafirkhana',
      village: 'Shivgarh',
      documentType: 'legacy_record',
      recordYear: '1985',
      sourceDepartment: 'District Record Room',
      description: 'Old legacy record - handwritten Hindi',
    },
    processingStatus: 'completed',
    processingProgress: 100,
    uploadedBy: 'usr-006',
    uploadedAt: '2026-08-20T08:00:00+05:30',
  },
  {
    id: 'doc-009',
    fileName: 'Legacy_45_1_Mohanganj.png',
    fileType: 'png',
    fileSize: 5500000,
    documentType: 'legacy_record',
    metadata: {
      state: 'Uttar Pradesh',
      district: 'Amethi',
      tehsil: 'Jagdishpur',
      village: 'Mohanganj',
      documentType: 'legacy_record',
      recordYear: '1972',
      sourceDepartment: 'District Record Room',
      description: 'Very old handwritten legacy record',
    },
    processingStatus: 'ocr_htr',
    processingProgress: 45,
    uploadedBy: 'usr-005',
    uploadedAt: '2026-09-08T10:00:00+05:30',
  },
  {
    id: 'doc-new-001',
    fileName: 'Mutation_Record_Kasimpur.pdf',
    fileType: 'pdf',
    fileSize: 1800000,
    documentType: 'mutation_record',
    metadata: {
      state: 'Uttar Pradesh',
      district: 'Amethi',
      tehsil: 'Jagdishpur',
      village: 'Kasimpur',
      documentType: 'mutation_record',
      recordYear: '2025',
      sourceDepartment: 'Tehsil Revenue Office',
    },
    processingStatus: 'queued',
    processingProgress: 0,
    uploadedBy: 'usr-005',
    uploadedAt: '2026-09-09T16:00:00+05:30',
  },
];

export const MOCK_EXTRACTION_RESULT: ExtractionResult = {
  documentId: 'doc-003',
  fields: [
    {
      fieldName: 'ownerName',
      fieldLabel: 'Landowner Name',
      extractedValue: 'राजेन्द्र प्रसाद / Rajendra Prasad',
      confidence: 78,
      sourcePage: 1,
      validationStatus: 'warning',
      suggestions: ['Rajendra Prasad', 'Rajender Prasad'],
    },
    {
      fieldName: 'fatherName',
      fieldLabel: 'Father / Husband Name',
      extractedValue: 'बाबू लाल / Babu Lal',
      confidence: 82,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'surveyNumber',
      fieldLabel: 'Survey Number',
      extractedValue: '142/3',
      confidence: 95,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'khasraNumber',
      fieldLabel: 'Khasra Number',
      extractedValue: '142/3',
      confidence: 95,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'khataNumber',
      fieldLabel: 'Khata Number',
      extractedValue: '112',
      confidence: 91,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'area',
      fieldLabel: 'Area',
      extractedValue: '3.2 Acres',
      confidence: 72,
      sourcePage: 1,
      validationStatus: 'warning',
      suggestions: ['3.2 Acres', '3.20 Acres', '1.30 Hectares'],
    },
    {
      fieldName: 'village',
      fieldLabel: 'Village',
      extractedValue: 'सेमरौता / Semrauta',
      confidence: 88,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'tehsil',
      fieldLabel: 'Tehsil',
      extractedValue: 'गौरीगंज / Gauriganj',
      confidence: 93,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'district',
      fieldLabel: 'District',
      extractedValue: 'अमेठी / Amethi',
      confidence: 97,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'landClassification',
      fieldLabel: 'Land Classification',
      extractedValue: 'Agricultural / कृषि भूमि',
      confidence: 85,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'ownershipType',
      fieldLabel: 'Ownership Type',
      extractedValue: 'Individual / एकल स्वामित्व',
      confidence: 80,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'mutationDetails',
      fieldLabel: 'Mutation Details',
      extractedValue: 'Sale Deed - Harish Chandra to Rajendra Prasad (10/11/2022)',
      confidence: 68,
      sourcePage: 2,
      validationStatus: 'warning',
    },
  ],
  rawText: `खसरा सं॰ 142/3\nग्राम: सेमरौता, तहसील: गौरीगंज, जिला: अमेठी\n\nखातेदार का नाम: राजेन्द्र प्रसाद\nपिता का नाम: बाबू लाल\nक्षेत्रफल: 3.2 एकड़\nभूमि का प्रकार: कृषि भूमि\n\nदखल दिनांक: 10/11/2022\nपूर्व खातेदार: हरीश चन्द्र\nहस्तांतरण का प्रकार: विक्रय\n\nपंजीयन सं॰: REG/2022/AMT/3456\nतहसीलदार हस्ताक्षर: ____________\nदिनांक: 15/11/2022`,
  language: 'Hindi + English',
  pageCount: 2,
  qualityScore: 82,
  overallConfidence: 78,
  processingTime: 12.5,
  extractedAt: '2026-09-05T15:30:00+05:30',
};

export const MOCK_EXTRACTION_HIGH_CONFIDENCE: ExtractionResult = {
  documentId: 'doc-001',
  fields: [
    {
      fieldName: 'ownerName',
      fieldLabel: 'Landowner Name',
      extractedValue: 'राम कुमार / Ram Kumar',
      confidence: 98,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'fatherName',
      fieldLabel: 'Father / Husband Name',
      extractedValue: 'शिव प्रसाद / Shiv Prasad',
      confidence: 96,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'surveyNumber',
      fieldLabel: 'Survey Number',
      extractedValue: '125/2',
      confidence: 99,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'khasraNumber',
      fieldLabel: 'Khasra Number',
      extractedValue: '125/2',
      confidence: 99,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'khataNumber',
      fieldLabel: 'Khata Number',
      extractedValue: '104',
      confidence: 97,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'area',
      fieldLabel: 'Area',
      extractedValue: '2.5 Acres',
      confidence: 94,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'village',
      fieldLabel: 'Village',
      extractedValue: 'रामपुर / Rampur',
      confidence: 96,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'tehsil',
      fieldLabel: 'Tehsil',
      extractedValue: 'गौरीगंज / Gauriganj',
      confidence: 97,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'district',
      fieldLabel: 'District',
      extractedValue: 'अमेठी / Amethi',
      confidence: 99,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'landClassification',
      fieldLabel: 'Land Classification',
      extractedValue: 'Agricultural / कृषि भूमि',
      confidence: 95,
      sourcePage: 1,
      validationStatus: 'valid',
    },
    {
      fieldName: 'ownershipType',
      fieldLabel: 'Ownership Type',
      extractedValue: 'Individual / एकल स्वामित्व',
      confidence: 93,
      sourcePage: 1,
      validationStatus: 'valid',
    },
  ],
  rawText: `खसरा सं॰ 125/2\nग्राम: रामपुर, तहसील: गौरीगंज, जिला: अमेठी\n\nखातेदार का नाम: राम कुमार\nपिता का नाम: शिव प्रसाद\nक्षेत्रफल: 2.5 एकड़\nभूमि का प्रकार: कृषि भूमि\nस्वामित्व: एकल\n\nखाता सं॰: 104\nदिनांक: 15/03/2018`,
  language: 'Hindi + English',
  pageCount: 1,
  qualityScore: 95,
  overallConfidence: 96,
  processingTime: 8.2,
  extractedAt: '2026-07-15T11:00:00+05:30',
};

export function createProcessingPipeline(currentStage: string): ProcessingPipelineStep[] {
  const stages: { stage: ProcessingPipelineStep['stage']; label: string }[] = [
    { stage: 'quality_check', label: 'Document Quality Check' },
    { stage: 'language_detection', label: 'Language Detection' },
    { stage: 'ocr_htr', label: 'OCR / Handwriting Recognition' },
    { stage: 'information_extraction', label: 'Information Extraction' },
    { stage: 'entity_detection', label: 'Entity / Field Detection' },
    { stage: 'validation', label: 'Validation' },
    { stage: 'duplicate_detection', label: 'Duplicate Detection' },
    { stage: 'confidence_scoring', label: 'Confidence Scoring' },
  ];

  const stageOrder = stages.map(s => s.stage);
  const currentIndex = stageOrder.indexOf(currentStage as ProcessingPipelineStep['stage']);

  return stages.map((s, i) => {
    let status: ProcessingPipelineStep['status'] = 'pending';
    if (i < currentIndex) status = 'completed';
    else if (i === currentIndex) status = 'running';

    return {
      stage: s.stage,
      status,
      startedAt: status !== 'pending' ? new Date(Date.now() - (stages.length - i) * 60000).toISOString() : undefined,
      completedAt: status === 'completed' ? new Date(Date.now() - (stages.length - i - 1) * 60000).toISOString() : undefined,
      duration: status === 'completed' ? Math.random() * 5 + 1 : undefined,
      details: status === 'running' ? 'Processing...' : status === 'completed' ? 'Completed successfully' : undefined,
    };
  });
}

export function getExtractionFieldsByConfidence(fields: ExtractionField[]): {
  high: ExtractionField[];
  medium: ExtractionField[];
  low: ExtractionField[];
} {
  return {
    high: fields.filter(f => f.confidence >= 90),
    medium: fields.filter(f => f.confidence >= 70 && f.confidence < 90),
    low: fields.filter(f => f.confidence < 70),
  };
}
