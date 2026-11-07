declare module 'matroska-subtitles' {
  export class SubtitleParser {
    constructor();
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
    write(chunk: any): void;
    end(): void;
  }
}
