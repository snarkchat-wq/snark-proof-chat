// Global polyfills for browser environment
import { Buffer } from 'buffer';

// Ensure Buffer exists (used by snarkjs/circomlibjs)
if (!(globalThis as any).Buffer) {
  (globalThis as any).Buffer = Buffer;
}
