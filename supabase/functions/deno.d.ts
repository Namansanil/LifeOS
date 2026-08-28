declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  };
}

declare module 'https://*' {
  const content: any;
  export default content;
  export const serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  export const createClient: (url: string, key: string, options?: any) => any;
}
