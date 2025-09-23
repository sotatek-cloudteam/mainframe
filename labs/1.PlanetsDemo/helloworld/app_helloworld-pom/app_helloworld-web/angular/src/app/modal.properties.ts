export class ModalProperties{
  /** The left position. */
  public positionLeft: number;
  /** The top position. */
  public positionTop: number;

  /** The cursor position from which displaying modal. Actually not exploited.*/
  public cursorPosition: boolean;

  /** The size's height. Actually not exploited, modal height is set by the content */
  public height: number;

  /** The size's width. */
  public width: number;

  /** The message line for the modal (*MSGLIN | *NOMSGLIN) */
  public messageLine: boolean;

}
