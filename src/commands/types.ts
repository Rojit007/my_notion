export interface ICommand {
  readonly type: string;
  execute(): void;
  undo(): void;
  mergeWith?(other: ICommand): ICommand | null;
}
