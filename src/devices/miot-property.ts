export interface MiotProperty {
  readonly siid: number;
  readonly piid: number;
  readonly format: 'boolean' | 'integer';
  readonly min?: number;
  readonly max?: number;
  readonly writable?: boolean;
}
