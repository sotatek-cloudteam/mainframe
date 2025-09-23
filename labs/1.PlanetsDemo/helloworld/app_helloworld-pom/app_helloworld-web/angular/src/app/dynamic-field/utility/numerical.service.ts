import { NumericProperties } from '../../term/term.model';

/**
 * Utils class used for processing numerical fields.
 */
export class NumericalService {
	/* FIELDS ============================================================== */

	/**
	 * Leading zero regex
	 */
    static LEADING_ZERO_REGEX = /^[0 +-]+/;

	/**
	 * Compute the size value for a numeric field according the given edit code
	 *
	 * @param numerical the type of numerical
	 * @return true if the field is a numerical
	 */
	static isNumerical(numerical : string) : boolean {
		return "NUM_STD" === numerical || "NUM_SIGNED" === numerical || "NUM_DIG" === numerical;
	}

	/**
	 * Check if the numerical is a standard numerical
	 *
	 * @param numerical the type of numerical
	 * @return true if the field is a standard numerical
	 */
	static isStandardNumerical(numerical : string) : boolean {
		return "NUM_STD" === numerical;
	}

	/**
	 * Check if the numeric type is signed numeric or not.
	 *
	 * @param numerical numeric type
	 * @return true if the type is signed numeric.
	 */
	static isSignedNumeric(numerical: string): boolean {
		return 'NUM_SIGNED' === numerical;
	}

	/**
	 * Check if the numeric type is Digits only numeric or not.
	 *
	 * @param numerical numeric type
	 * @return true if the type is digits only numeric.
	 */
	static isDigitsOnlyNumeric(numerical: string): boolean {
		return 'NUM_DIG' === numerical;
	}


	/**
	 * Check if a value is numeric or not
	 *
	 * @param value the type of numerical
	 * @return true if the field is a numerical
	 */
	static isNumericValue(value : string) : boolean {
		return /^[ +-.,\d]+$/.test(value);
	}

	/**
	 * Check if the user input is valid for a signed numeric field
	 *
	 * @param key the user input
	 *
	 * @returns true if this is valid entry for signed numeric
	 */
	static isValidSignedNumericEntry(key: string): boolean {
		return key && (key === '-' || key === '+' || key === ' ' || (key >= '0' && key <= '9'));
	}

	/**
	 * Check if the value entered respects the numeric format
	 *
	 * @param value The value to check
	 * @param numericProperties The properties of the field
	 * @return true if value is valid numeric format
	 */
	static isValidNumericFormat(value: string, numericProperties: NumericProperties): boolean {
	    if(value === undefined){
            return false;
        }
        if(typeof value !== 'string'){
            value = String(value);
        }
	    value = value.replace('-','').trim();
		let scale = numericProperties.scale;
		let precision = numericProperties.precision;
		let split = value.toString().split('.');
		if (split.length > 2)
		{
			return false;
		}
		let noLeadingZeroes = parseInt(split[0], 10);
		let wholePart = isNaN(noLeadingZeroes) ? 0 :  noLeadingZeroes.toString().length;
		let decimalPart = split.length == 2 ? split[1].length : 0;
		return !((wholePart > precision - scale) || (decimalPart > scale));
	}

	/**
	 * Convert Decimal format of numerical value depending on config QDECFMT
	 * Replace comma with point and point with comma
	 *
	 * @returns the formatted value
	 * @param value The value to convert
	 * @param qdecfmt the decimal format
	 * @returns the converted value
	 */
	static convertDecimalFormat(value : string, qdecfmt : string) : string {
		// Ensure the type is really a string
		if(typeof value !== "string"){
			return value;
		}

		if(qdecfmt == "J" || qdecfmt == "I") {
			let result = "";
			for (let ch of value) {
				if (ch == ','){
					result += '.';
				} else if (ch == '.'){
					result += ',';
				} else {
					result += ch;
				}
			}
			return result;
		} else {
			return value;
		}
	}

	/**
	 * Converts a program value to signed numeric.
	 *
	 * @param value The value sent by the program
	 * @param scale the number of decimals
	 *
	 * @return The displayed value
	 */
	static convertToSignedNumeric(value: string, scale: number): string {
		scale = scale ?? 0;
		// Convert the value to string
		value = String(value);
		value = value.trim();
		let result: string;
		// Populate the last character (sign)
		if (value.indexOf('-') >= 0) {
			value = value.replace('-', '');
			result = '-';
		} else {
			result = ' ';
		}

		let sepLoc = value.indexOf('.');
		if (sepLoc < 0) {
			// substring handles the edge cases
			sepLoc = value.length;
		}
		// Populate the decimals
		result = this.rightPadWith(value.substring(sepLoc + 1, value.length), scale, '0') + result;
		// Populate the integers
		result = value.substring(0, sepLoc) + result;

		// Perform zero suppression
		let start = 0;
		while(result.charAt(start) === '0') {
			start++;
		}
		return result.substring(start);
	}

	/**
	 * Converts signed numeric input to program value.
	 *
	 * @param value The value sent by the program
	 * @param scale the number of decimals
	 *
	 * @return The program value
	 */
	static convertFromSignedNumeric(value: string, scale: number): string {
		scale = scale ?? 0;
		value = String(value);
		let result: string = '';
		if (value.indexOf('-') >= 0) {
			result += '-';
			value = value.replace('-', '');
		}
		value = value.trim();
		if(value.length === 0) {
			return '0';
		}
		// Convert all the blanks to zeroes
		value = value.replace(' ', '0');
		if (scale > 0) {
			if (value.length <= scale) {
				result += '0.';
			} else {
				result += value.slice(0, scale * -1) + '.';
			}
			result += this.leftPadWith(value.slice(scale * -1), scale, '0');
		} else {
			result += value;
		}
		return result;
	}


	/**
	 * Convert program value to unedited Standard numeric value.
	 *
	 * @param value The value sent by the program
	 * @param precision precision
	 * @param scale scale
	 *
	 * @return unedited numeric value
	 */
	static convertToUneditedStdNum(value: string, precision: number, scale: number): string {
		let sign = '';
		// If value sent is not numeric => it is DFT value.
		value = String(value);
		if (value.trim() === '') {
			return value;
		}
		value = value.trim();
		// For negative numbers
		// The sign appears in the farthest right display position on
		// output and takes up one of the positions in the display length.
		if(value.indexOf('-') >= 0) {
			value = value.replace('-', '');
			sign = '-';
		}
		let sepLoc = value.indexOf('.');
		if (sepLoc < 0) {
			// substring handles the edge cases
			sepLoc = value.length;
		}
		// Populate the decimals
		let result = this.rightPadWith(value.substring(sepLoc + 1, value.length), scale, '0');
		// Populate the integers
		result = value.substring(0, sepLoc) + result;
		// left pad with zeroes.
		return this.leftPadWith(result + sign, precision, '0');
	}

	/**
	 * Convert standard numeric input value to program value.
	 *
	 * @param value Unedited numeric input
	 * @param qdecfmt the decimal format of the application. Optional (for digits only)
	 *
	 * @return program value
	 */
	static convertStdNumToProgramValue(value: string, qdecfmt?: string): string {
		let result = String(value);
		let sign: string = '';
		// Process sign - if the field is either prefixed or suffixed with a '-' or if the field is suffixed
		// with a "CR" or "R", we set the sign to '-' to be appended to the return value later.
		if (result.startsWith('-') || result.endsWith('-') || result.toUpperCase().endsWith('R')) {
			result = result.replace('-', '');
			sign = '-';
		}
		// Trim the leading zeroes/spaces until a significant digit
		// Also trim the trailing spaces
		result = result.replace(NumericalService.LEADING_ZERO_REGEX, '').trimEnd();
		// Convert embedded blanks to Zeroes
		result = result.replaceAll(' ', '0');
		if (qdecfmt) {
			result = this.convertDecimalFormat(result, qdecfmt);
		}
		// Remove all non-numeric characters
		result = result.replaceAll(/[^.0-9]/g, '');
		// if starting with decimal point, add
		if (result.length === 0) {
			return '0';
		}
		if (result.length > 0 && result.charAt(0) === '.') {
			result = '0' + result;
		}
		// Append the sign back in the case that the value was a negative before we converted it.
		return sign + result;
	}

	private static leftPadWith(value: string, length: number, padChar: string) {
		// Only consider the required length
		if (value.length >= length) {
			return value.slice(length * -1);
		}
		return padChar.repeat(Math.max(0, length - value.length)) + value;
	}

	private static rightPadWith(value: string, length: number, padChar: string) {
		// Only consider the required length
		if (value.length >= length) {
			return value.slice(0, length);
		}
		return value + padChar.repeat(Math.max(0, length - value.length));
	}
}
