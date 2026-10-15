import { Injectable } from '@nestjs/common';

export interface TextChunk {
  chunkIndex: number;
  content: string;
}

@Injectable()
export class TextChunkerService {
  /**
   * Splits long text into chunks of roughly maxChunkSize with overlap
   */
  chunkText(
    text: string,
    maxChunkSize: number = 800,
    overlapSize: number = 100,
  ): TextChunk[] {
    const cleaned = text.trim();
    if (!cleaned) return [];

    if (cleaned.length <= maxChunkSize) {
      return [{ chunkIndex: 0, content: cleaned }];
    }

    const chunks: TextChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < cleaned.length) {
      let end = start + maxChunkSize;
      if (end >= cleaned.length) {
        end = cleaned.length;
      } else {
        // Try to break at a paragraph or sentence boundary
        const nextBreak = cleaned.lastIndexOf('\n', end);
        const nextSentence = cleaned.lastIndexOf('. ', end);
        const nextSpace = cleaned.lastIndexOf(' ', end);

        if (nextBreak > start + maxChunkSize * 0.5) {
          end = nextBreak + 1;
        } else if (nextSentence > start + maxChunkSize * 0.5) {
          end = nextSentence + 2;
        } else if (nextSpace > start + maxChunkSize * 0.5) {
          end = nextSpace + 1;
        }
      }

      const chunkContent = cleaned.slice(start, end).trim();
      if (chunkContent.length > 0) {
        chunks.push({
          chunkIndex: index++,
          content: chunkContent,
        });
      }

      if (end >= cleaned.length) {
        break;
      }

      // Step forward accounting for overlap
      start = Math.max(start + 1, end - overlapSize);
    }

    return chunks;
  }
}
