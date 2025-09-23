const enum MinusSignRule {
	/** The no. */
	NO,
	/** The left. */
	LEFT,
	/** The right. */
	RIGHT,
	/** The cr. */
	CR
}

export class EditCodeService {
	/* FIELDS ============================================================== */
	static BLANK: string = ' ';
	static ZERO: string = '0';

	static QDECFMT: String = "";

	/**
	 * Compute the size value for a numeric field according the given edit code
	 *
	 * @param rawValue The raw value that needs to be converted. (if this is a string, decimal separator is assumed to be '.')
	 * @param fieldSize The total field size
	 * @param scale the scale of the field
	 * @param editCode the edit code to use to format the number
	 * @param qdecfmt the Decimal format
	 * @returns A value which is formatted according to the edit code.
	 */
    static buildValue(rawValue: any, fieldSize: number, scale: number, editCode: string, qdecfmt: string): string {

        this.QDECFMT = qdecfmt;
        // Convert to string
        rawValue = rawValue.toString();
        const chars = editCode.split(' ');
        let currency = null;
        if (chars.length > 1) {
            currency = chars[1];
        }
        editCode = chars[0];

        let result = "";
        let fractionalFormat = undefined;
        let isNegative = rawValue.indexOf('-') > -1;

        if (!EditCodeService.isNumber(rawValue.toString())) {
            return rawValue.toString();
        }
        // remove minus sign, will be added later depending of editCode
        rawValue = rawValue.replace('-', '');

        if (scale > 0) {
            fractionalFormat = "0".repeat(scale);
            // for decimal number, if the decimal separator is not displayed we take the unscaled value
            if (!EditCodeService.isDecimalPointsDisplayed(editCode)) {
                rawValue = rawValue.replace('.', '');
            }

        }

        // Remove grouping separator if present.
        rawValue = rawValue.replace(/,/g, '');
        if (editCode === 'W' || editCode === 'Y') {
			// This is date edit code
            return this.formatNumberAsDate(rawValue, fieldSize, editCode);
        }

        let isZero = Number(rawValue) === 0;
        let intPart = rawValue.split(".")[0];
        let decimalPart = scale == 0 ? '' : rawValue.split(".")[1];
        
        // specific case when Zero Balance
        if (isZero && EditCodeService.isDisplayZeroBalance(editCode)) {
            result = fractionalFormat? EditCodeService.buildZeroValue(fractionalFormat) : '0';
        } else if (isZero) {
            // We display blank instead of zero because display zero balance is false.
            result = '';
        } else if(this.isGroupingSepDisplayed(editCode)) {
            // not a Zero Balance
            // add separator every 3 digits
			result = this.performGrouping(intPart, scale, decimalPart, editCode);
		} else {
			result = rawValue;
		}

        if (this.QDECFMT != "J" && !isZero) {
            result = EditCodeService.removeUnitZero(result, Number(intPart) === 0 );
        }
        
        
        if(!isZero){
        	// Suppress the leading zeroes
	        let i = 0;
	        while (i < result.length && result[i] == '0') {
	           
	            i+=1;
	        } 
	         result = result.slice(i);
		}
       

        // add sign if required
        result = EditCodeService.handleSign(result, isNegative, editCode);

        // add currency if required
        result = EditCodeService.handleCurrency(result, currency);

        if (fieldSize > result.length) {
            let padChar = EditCodeService.isSuppressZeroes(editCode) ? EditCodeService.BLANK : EditCodeService.ZERO;
            result = EditCodeService.padLeft(result, fieldSize, padChar);
        }


        return result;
    }

	/**
	 * Perform grouping and build the string from the integer part and the decimal part.
	 * The digits in the int part are grouped by 3 from the least significant to the most.
	 *
	 * @param intPart the integer part of the number
	 * @param scale the scale for the number
	 * @param decimalPart the decimal part of the number
	 * @param editCode the edit code that is used to format the number. Used to check if decimals is displayed or not
	 * @private
	 */
	private static performGrouping(intPart: string, scale: number, decimalPart: string, editCode: string) {
		let result = '';
		let separator = '';
		let counter = 1;
		let groupingSeparator = EditCodeService.getFormatSeparator();

		for (let i = intPart.length - 1; i >= 0; i--) {
			separator = counter % 3 === 0 ? groupingSeparator : '';
			result = separator + intPart[i] + result;
			counter += 1;
		}
		// If this starts with the grouping separator, then remove it
		if (result.startsWith(groupingSeparator)) {
			result = result.slice(1);
		}
		// Add decimal separator if needed
		if (scale != 0 && EditCodeService.isDecimalPointsDisplayed(editCode)) {
			result += EditCodeService.getDecimalSeparator() + decimalPart;
		}
		return result;
	}

	/**
	 * Build the string value for the number 0
	 *  Blank value of QDECFMT > .00
	 *	I value of QDECFMT     > ,00
	 *	J value of QDECFMT     > 0,00
	 * @param fractionalFormat
	 * @return the string value for the number 0
	 */
	static buildZeroValue(fractionalFormat : string) : string {
		let sbZero = '';
		if (EditCodeService.QDECFMT == "J") {
			sbZero += "0";
		}
		sbZero += EditCodeService.getDecimalSeparator() + fractionalFormat;
		return sbZero.toString();
	}

	static isNumber(value: string | number): boolean {
		return ((value != null) &&
			(value !== '') &&
			!isNaN(Number(value.toString().replace(/,/g, ''))));
	}
	static isDisplayZeroBalance(editCode : String) : boolean {
		let isDisplayZeroBalance = true;
		// DisplayZeroValue
		switch (editCode) {
			case "2":
			case "4":
			case "B":
			case "D":
			case "K":
			case "M":
			case "O":
			case "Q":
			case "Z":
				isDisplayZeroBalance = false;
				break;
		}
		return isDisplayZeroBalance;
	}

	private static getDecimalSeparator() : string {
		return (this.QDECFMT == "J" || this.QDECFMT == "I") ? ',': '.';
	}
	
	private static getFormatSeparator() : string {
		return (this.QDECFMT == "J" || this.QDECFMT == "I") ? '.': ',';
	}

	/**
	 * When you specify floating currency symbol, the symbol appears to the left of the first significant digit.
	 *
	 * @param result the result
	 * @param currency the currency
	 * @return the string
	 */
	private static handleCurrency(result: string, currency: string) : string {
		if (result.trim().length > 0 && currency !== null && currency !== '') {
			result = currency + result;
		}
		return result;
	}

	/**
	 * set the sign to the right or to the left according minusSignRule.
	 *
	 * @param result the result
	 * @param isNegativeNumber the is negative number
	 * @param editCode the edit code
	 * @return the string
	 */
    private static handleSign(result: string, isNegativeNumber: boolean, editCode: string): string {
        let minusSignRule = EditCodeService.determineMinusSignRule(editCode);
        if (minusSignRule == MinusSignRule.RIGHT || minusSignRule == MinusSignRule.CR) {
            // negative number
            if (isNegativeNumber) {
                result = result + EditCodeService.getMinusSignForMinusSignRule(minusSignRule);
            } else {
                // Positive number
                // reserve the space for the plus sign
                if (minusSignRule == MinusSignRule.CR) {
                    result = result + "  ";
                } else {
                    result = result + EditCodeService.BLANK;
                }
            }
        } else if (minusSignRule == MinusSignRule.LEFT && isNegativeNumber) {

            result = '-' + result;
        }

        return result;
    }

	/**
	 * Determine minus sign rule.
	 *
	 * @param editCode the edit code
	 * @return the minus sign rule
	 */
	private static determineMinusSignRule(editCode: string) : MinusSignRule {
		let minusSign = MinusSignRule.NO;
		// MinusSign
		switch (editCode) {
			case "1":
			case "2":
			case "3":
			case "4":
			case "W":
			case "Z":
				minusSign = MinusSignRule.NO;
				break;
			case "A":
			case "B":
			case "C":
			case "D":
				minusSign = MinusSignRule.CR;
				break;
			case "J":
			case "K":
			case "L":
			case "M":
				minusSign = MinusSignRule.RIGHT;
				break;
			case "X":
				// Do not reserve space for sign
				minusSign = MinusSignRule.NO;
				break;
			case "N":
			case "O":
			case "P":
			case "Q":
				minusSign = MinusSignRule.LEFT;
				break;
		}
		return minusSign;
	}

	/**
	 * Gets the minus sign for minus sign rule.
	 *
	 * @param minusSignRule the minus sign rule
	 * @return the minus sign for minus sign rule
	 */
	static getMinusSignForMinusSignRule(minusSignRule : MinusSignRule) : string {
		let minusSign = "-";
		if (minusSignRule == MinusSignRule.CR) {
			minusSign = "CR";
		}
		return minusSign;
	}

	/**
	 * Checks if is commas displayed.
	 *
	 * @param editCode the edit code
	 * @return true, if is commas displayed
	 */
	static isGroupingSepDisplayed(editCode : string) : boolean {
		let isCommasDisplayed = false;
		switch (editCode) {
			case "1":
			case "2":
			case "A":
			case "B":
			case "J":
			case "K":
			case "N":
			case "O":
				isCommasDisplayed = true;
				break;
		}

		return isCommasDisplayed;
	}

	/**
	 * Checks if is decimal points displayed.
	 *
	 * @param editCode the edit code
	 * @return true, if is decimal points displayed
	 */
	private static isDecimalPointsDisplayed(editCode : string) : boolean {
		let isDecimalPointsDisplayed = false;
		switch (editCode) {
			case "1":
			case "2":
			case "3":
			case "4":
			case "A":
			case "B":
			case "C":
			case "D":
			case "J":
			case "K":
			case "L":
			case "M":
			case "N":
			case "O":
			case "P":
			case "Q":
				isDecimalPointsDisplayed = true;
				break;
			case "W":
				break;
			case "Y":
				return false;
			case "Z":
			case "X":
				break;
		}

		return isDecimalPointsDisplayed;
	}

	private static isSuppressZeroes(editCode: string): boolean {
		return editCode !== 'X';
	}

	static padLeft = (value: string, length: number, character: string = '0'): string => {
		for (let i = value.length; i < length; ++i) {
			value = character + value;
		}
		return value;
	}


    static removeUnitZero(value: string, betweenZeroAndOne: boolean): string {
        if (betweenZeroAndOne) {
            let index = value.indexOf('0' + EditCodeService.getDecimalSeparator());
            value = value.slice(0, index) + value.slice(index + 1);
        }
        return value;
    }

	/**
	 * Format the given value as a date with rules defined by the edit code.
	 *
	 * @param rawValue The value representing the number
	 * @param fieldSize the maximum size of the field
	 * @param editCode the edit code to use for formatting (should be either W or Y)
	 * @returns the formatted string value of the date field
	 * @private
	 */
	private static formatNumberAsDate(rawValue: string, fieldSize: number, editCode: string): string {
		if (editCode !== 'W' && editCode !== 'Y') {
			return rawValue;
		}
		// Remove any grouping separators
		let formatedValue: string = rawValue;
		// Consider empty as zero
		if (formatedValue === '') {
			formatedValue = '0';
		}
		// Remove any sign
		if (formatedValue.indexOf('-') > -1) {
			formatedValue = formatedValue.replace('-', '');
		}
		let precision = this.precisionFromFieldSize(fieldSize, editCode);
		formatedValue = formatedValue.padStart(precision, '0');
		// Add date separators
		let dateSep: string = '/';
		if (editCode === 'W') {
			if (precision < 5) {
				return formatedValue;
			} else if (precision === 7) {
				formatedValue = formatedValue.slice(0, -2) + dateSep + formatedValue.slice(-2);
			} else if (precision < 8) {
				formatedValue = formatedValue.slice(0, -3) + dateSep + formatedValue.slice(-3);
			} else {
				formatedValue = formatedValue.slice(0, -4) + dateSep + formatedValue.slice(-4, -2) + dateSep + formatedValue.slice(-2);
			}
		} else {
			if (precision < 3) {
				return formatedValue;
			} else if (precision === 3) {
				formatedValue = formatedValue.slice(0, -1) + dateSep + formatedValue.slice(-1);
			} else if (precision === 4) {
				formatedValue = formatedValue.slice(0, -2) + dateSep + formatedValue.slice(-2);
			} else if (precision === 5) {
				formatedValue = formatedValue.slice(0, -3) + dateSep + formatedValue.slice(-3, -1) + dateSep + formatedValue.slice(-1);
			} else if (precision < 8) {
				formatedValue = formatedValue.slice(0, -4) + dateSep + formatedValue.slice(-4, -2) + dateSep + formatedValue.slice(-2);
			} else {
				formatedValue = formatedValue.slice(0, -6) + dateSep + formatedValue.slice(-6, -4) + dateSep + formatedValue.slice(-4);
			}
		}
		// Suppress the leading zeroes
		let i = 0;
		while (i < formatedValue.length && formatedValue.charAt(i) === '0') {
			i++;
		}
		return formatedValue.substring(formatedValue.charAt(i) === dateSep ? i - 1:  i).padStart(fieldSize);
	}

	/**
	 * Get the precision of the field from the field size
	 *
	 * @param fieldSize the field size
	 * @param editCode the edit code
	 * @returns the field size
	 * @private
	 */
	private static precisionFromFieldSize(fieldSize: number, editCode: string): number {
		if ((editCode === 'W' && fieldSize < 4) || (editCode === 'Y' && fieldSize < 2)) {
			// No separators
			return fieldSize;
		} else if (fieldSize < 7) {
			// 1 Separator
			return fieldSize - 1;
		} else {
			// 2 Separators
			return fieldSize - 2;
		}
	}
}
