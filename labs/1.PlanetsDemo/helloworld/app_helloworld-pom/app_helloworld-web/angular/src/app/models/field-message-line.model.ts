export class FieldMessageLine {
    messageLine: any;
    line: number;
    column: number;
    parentIndex: number;

    /**
     * Constructor for field message line
     *
     * @param messageLine the message line
     * @param line the line number associated with the field
     * @param column the column number associated with the field
     * @param parentIndex the parent index of the field
     * @private
     */
    private constructor(messageLine: any, line: number, column: number, parentIndex: number) {
        this.messageLine = messageLine;
        this.line = line;
        this.column = column;
        this.parentIndex = parentIndex;
    }

    /**
     * Static method used to build a field message line object
     *
     * @param messageLine the message line
     * @param line the line number associated with the field
     * @param column the column number associated with the field
     * @param parentIndex the parent index associated with the field
     */
    public static build(messageLine: any, line: number, column: number, parentIndex: number): FieldMessageLine {
        return new FieldMessageLine(messageLine, line, column, parentIndex);
    }

}
