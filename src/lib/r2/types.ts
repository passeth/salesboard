export interface R2ContentFile {
  key: string;
  fileName: string;
  category: string;
  size: number;
  lastModified: Date;
  publicUrl: string;
}

export interface ContentFolder {
  slug: string;
  files: R2ContentFile[];
}
