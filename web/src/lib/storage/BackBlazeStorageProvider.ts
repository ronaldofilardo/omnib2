import { StorageProvider, FileMetadata, UploadOptions, StorageResult } from './StorageProvider';

/**
 * BackBlaze B2 Storage Provider
 *
 * Implementação para armazenamento de arquivos no BackBlaze B2.
 * Prepara a migração da duplicação url/physicalPath para armazenamento 100% em nuvem.
 */
export class BackBlazeStorageProvider implements StorageProvider {
  private accountId: string;
  private applicationKey: string;
  private bucketId: string;
  private bucketName: string;
  private apiUrl: string;
  private authorizationToken: string | null = null;

  constructor() {
    this.accountId = process.env.BACKBLAZE_ACCOUNT_ID || '';
    this.applicationKey = process.env.BACKBLAZE_APPLICATION_KEY || '';
    this.bucketId = process.env.BACKBLAZE_BUCKET_ID || '';
    this.bucketName = process.env.BACKBLAZE_BUCKET_NAME || '';
    this.apiUrl = process.env.BACKBLAZE_API_URL || 'https://api.backblazeb2.com';

    if (!this.accountId || !this.applicationKey || !this.bucketId || !this.bucketName) {
      throw new Error('BackBlaze credentials not configured');
    }
  }

  /**
   * Autentica com a API do BackBlaze
   */
  private async authenticate(): Promise<void> {
    if (this.authorizationToken) return;

    const credentials = btoa(`${this.accountId}:${this.applicationKey}`);

    const response = await fetch(`${this.apiUrl}/b2api/v2/b2_authorize_account`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      throw new Error(`BackBlaze authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.authorizationToken = data.authorizationToken;
    this.apiUrl = data.apiUrl;
  }

  /**
   * Obtém URL de upload
   */
  private async getUploadUrl(): Promise<{ uploadUrl: string; uploadAuthToken: string }> {
    await this.authenticate();

    const response = await fetch(`${this.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        'Authorization': this.authorizationToken!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bucketId: this.bucketId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${response.statusText}`);
    }

    return response.json();
  }

  async upload(file: File, options: UploadOptions): Promise<StorageResult> {
    try {
      const { uploadUrl, uploadAuthToken } = await this.getUploadUrl();

      // Gerar nome único para o arquivo
      const fileName = `${Date.now()}-${file.name}`;
      const fileId = `b2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Calcular SHA1 do arquivo (requerido pelo B2)
      const fileBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-1', fileBuffer);
      const sha1 = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': uploadAuthToken,
          'X-Bz-File-Name': fileName,
          'Content-Type': file.type || 'application/octet-stream',
          'X-Bz-Content-Sha1': sha1,
          'X-Bz-Info-src_last_modified_millis': Date.now().toString(),
        },
        body: fileBuffer,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const uploadData = await response.json();

      const metadata: FileMetadata = {
        id: fileId,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        url: `https://f002.backblazeb2.com/file/${this.bucketName}/${fileName}`, // URL pública
        hash: sha1,
        expiryDate: options.expiryDate,
      };

      return {
        success: true,
        fileId,
        url: metadata.url!,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        fileId: '',
        url: '',
        metadata: {} as FileMetadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getUrl(fileId: string): Promise<string> {
    // Para BackBlaze, a URL é direta e pública
    // Em implementação real, pode precisar de signed URLs para arquivos privados
    const metadata = await this.getMetadata(fileId);
    if (!metadata?.url) {
      throw new Error('File URL not found');
    }
    return metadata.url;
  }

  async delete(fileId: string): Promise<boolean> {
    try {
      await this.authenticate();

      // NOTA: Para deletar no B2, precisamos do fileId do B2 e fileName.
      // Atualmente, armazenamos apenas nosso fileId interno.
      // Em implementação completa, devemos armazenar fileId_B2 e fileName no banco.

      // Placeholder: em produção, consultar banco para obter fileId_B2 e fileName
      console.warn(`BackBlaze delete: fileId ${fileId} - implementação incompleta. Requer fileId_B2 e fileName do banco.`);

      // Implementação futura:
      // const { fileId_B2, fileName } = await getFileInfoFromDB(fileId);
      // const response = await fetch(`${this.apiUrl}/b2api/v2/b2_delete_file_version`, {
      //   method: 'POST',
      //   headers: { 'Authorization': this.authorizationToken!, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ fileId: fileId_B2, fileName })
      // });
      // return response.ok;

      return false; // Placeholder - sempre falha até implementar
    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  }

  supportsLargeFiles(): boolean {
    return true; // BackBlaze suporta arquivos grandes
  }

  getMaxFileSize(): number {
    return 5 * 1024 * 1024 * 1024; // 5GB (limite B2)
  }

  async getMetadata(fileId: string): Promise<FileMetadata | null> {
    // NOTA: Em implementação completa, consultar banco de dados para obter metadados.
    // Atualmente, retorna null pois não temos armazenamento de metadados.
    // Metadados devem incluir: id, name, size, mimeType, uploadedAt, url, hash, expiryDate
    console.warn(`BackBlaze getMetadata: fileId ${fileId} - implementação incompleta. Requer consulta ao banco.`);

    // Implementação futura:
    // return await db.files.findUnique({ where: { id: fileId } });

    return null;
  }
}