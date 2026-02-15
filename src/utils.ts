export interface MathExpression {
    variable_name: string;
    value: number;
    unit: UnitDimension;
}

export interface Formula {
    id: string;
    name: string;
    latex: string;
    variables: {
        [key: string]: UnitDimension;
    };
    result_unit: UnitDimension;
    description?: string;
}

export interface MarkdownEditorProps {
    file_path: string;
    on_save?: (content: string) => void;
    initial_content?: string;
}

export interface MarkdownEditorRef {
    search_formulas: (expressions: MathExpression[]) => void;
    clear_search: () => void;
    get_content: () => string;
    set_content: (content: string) => void;
}

export type UnitDimension = [number, number, number, number, number, number, number];

export const DIM_METER: UnitDimension = [1, 0, 0, 0, 0, 0, 0];
export const DIM_SECOND: UnitDimension = [0, 1, 0, 0, 0, 0, 0];
export const DIM_KILOGRAM: UnitDimension = [0, 0, 1, 0, 0, 0, 0];
export const DIM_AMPERE: UnitDimension = [0, 0, 0, 1, 0, 0, 0];
export const DIM_KELVIN: UnitDimension = [0, 0, 0, 0, 1, 0, 0];
export const DIM_MOLE: UnitDimension = [0, 0, 0, 0, 0, 1, 0];
export const DIM_CANDELA: UnitDimension = [0, 0, 0, 0, 0, 0, 1];

// Derived units
export const DIM_HERTZ: UnitDimension = [0, -1, 0, 0, 0, 0, 0];
export const DIM_NEWTON: UnitDimension = [1, -2, 1, 0, 0, 0, 0];
export const DIM_PASCAL: UnitDimension = [-1, -2, 1, 0, 0, 0, 0];
export const DIM_JOULE: UnitDimension = [2, -2, 1, 0, 0, 0, 0];
export const DIM_WATT: UnitDimension = [2, -3, 1, 0, 0, 0, 0];
export const DIM_COULOMB: UnitDimension = [0, 1, 0, 1, 0, 0, 0];
export const DIM_VOLT: UnitDimension = [2, -3, 1, -1, 0, 0, 0];
export const DIM_FARAD: UnitDimension = [-2, 4, -1, 2, 0, 0, 0];
export const DIM_OHM: UnitDimension = [2, -3, 1, -2, 0, 0, 0];
export const DIM_SIEMENS: UnitDimension = [-2, 3, -1, 2, 0, 0, 0];
export const DIM_WEBER: UnitDimension = [2, -2, 1, -1, 0, 0, 0];
export const DIM_TESLA: UnitDimension = [0, -2, 1, -1, 0, 0, 0];
export const DIM_HENRY: UnitDimension = [2, -2, 1, -2, 0, 0, 0];

// Dimensionless
export const DIM_DIMENSIONLESS: UnitDimension = [0, 0, 0, 0, 0, 0, 0];

// Unit name mappings
export const UNIT_NAMES: { [key: string]: UnitDimension } = {
    'm': DIM_METER,
    's': DIM_SECOND,
    'kg': DIM_KILOGRAM,
    'A': DIM_AMPERE,
    'K': DIM_KELVIN,
    'mol': DIM_MOLE,
    'cd': DIM_CANDELA,
    'Hz': DIM_HERTZ,
    'N': DIM_NEWTON,
    'Pa': DIM_PASCAL,
    'J': DIM_JOULE,
    'W': DIM_WATT,
    'C': DIM_COULOMB,
    'V': DIM_VOLT,
    'F': DIM_FARAD,
    'Ω': DIM_OHM,
    'S': DIM_SIEMENS,
    'Wb': DIM_WEBER,
    'T': DIM_TESLA,
    'H': DIM_HENRY,
};

/**
 * Compare two unit dimensions for equality
 */
export function units_equal(a: UnitDimension, b: UnitDimension): boolean {
    return a.every((val, idx) => val === b[idx]);
}

/**
 * Multiply two unit dimensions (add exponents)
 */
export function multiply_units(a: UnitDimension, b: UnitDimension): UnitDimension {
    return a.map((val, idx) => val + b[idx]) as UnitDimension;
}

/**
 * Divide two unit dimensions (subtract exponents)
 */
export function divide_units(a: UnitDimension, b: UnitDimension): UnitDimension {
    return a.map((val, idx) => val - b[idx]) as UnitDimension;
}

/**
 * Raise a unit dimension to a power
 */
export function power_unit(unit: UnitDimension, power: number): UnitDimension {
    return unit.map(val => val * power) as UnitDimension;
}

/**
 * Get human-readable unit string from dimension
 */
export function unit_to_string(unit: UnitDimension): string {
    // const [m, s, kg, A, K, mol, cd] = unit;

    // Check for common derived units first
    for (const [name, dim] of Object.entries(UNIT_NAMES)) {
        if (units_equal(unit, dim) && name.length > 1) {
            return name;
        }
    }

    const parts: string[] = [];
    const base_names = ['m', 's', 'kg', 'A', 'K', 'mol', 'cd'];

    unit.forEach((exp, idx) => {
        if (exp !== 0) {
            const name = base_names[idx];
            parts.push(exp === 1 ? name : `${name}^${exp}`);
        }
    });

    return parts.join('·') || '1';
}


export function array_empty(unit: number[]): boolean {
    if (unit.length == 0) return true;
    for (const u of unit) {
        if (u != 0) return false;
    }
    return true;
}
// const baseUnits = ["m", "s", "kg", "A", "K", "mol", "cd"];
export function latex_unit_splitter(latex: string): string {
    // Base SI units (including 'g' for grams)
    const baseUnits = ["m", "s", "g", "A", "K", "mol", "cd"];

    // Derived units
    const derivedUnits = [
        "Hz", "N", "Pa", "J", "W", "C", "V", "F", "Ohm", "Wb", "T", "H", "S"
    ];

    // SI prefixes - both regular and LaTeX versions
    const prefixes = [
        "Y", "Z", "E", "P", "T", "G", "M", "k", "h", "da",
        "d", "c", "m", "\\mu", "μ", "n", "p", "f", "a", "z", "y"
    ];

    // Build all possible unit combinations (prefix + unit)
    const allUnits = new Set<string>();

    // Add base units without prefixes
    baseUnits.forEach(unit => allUnits.add(unit));

    // Add base units with prefixes
    baseUnits.forEach(unit => {
        // Skip kg with additional prefixes, but allow 'g' with all prefixes
        if (unit !== "kg") {
            prefixes.forEach(prefix => {
                allUnits.add(prefix + unit);
            });
        }
    });

    // Add derived units
    derivedUnits.forEach(unit => allUnits.add(unit));

    // Add derived units with prefixes
    derivedUnits.forEach(unit => {
        prefixes.forEach(prefix => {
            allUnits.add(prefix + unit);
        });
    });

    allUnits.add("in");
    allUnits.add("ft");
    allUnits.add("yd");
    allUnits.add("mi");
    allUnits.add("lb");

    // Sort by length (descending) to match longer units first
    const sortedUnits = Array.from(allUnits).sort((a, b) => b.length - a.length);

    // Create regex pattern that matches units not already preceded by backslash
    // The negative lookbehind checks for backslash not followed by 'mu'
    // or a regular backslash
    const pattern = new RegExp(
        `(?<!\\\\)(?<!\\\\mu )(${sortedUnits.map(u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
        'g'
    );

    // Replace matched units with backslash + unit
    return latex.replace(pattern, '\\$1');
}

// [ L, T, M, I, Θ, N, J ]

export function unit_to_latex(unit: number[]): string {
    if (unit.length !== 7) {
        throw new Error("Unit array must be exactly 7 elements long");
    }

    // Base units
    const baseUnits = ["m", "s", "kg", "A", "K", "mol", "cd"];

    // Derived units with their "complexity score"
    const derivedUnits: { symbol: string; dimensions: number[]; complexity: number }[] = [
        { symbol: "Hz", dimensions: [0, -1, 0, 0, 0, 0, 0], complexity: 1 },
        { symbol: "N", dimensions: [1, -2, 1, 0, 0, 0, 0], complexity: 3 },
        { symbol: "Pa", dimensions: [-1, -2, 1, 0, 0, 0, 0], complexity: 3 },
        { symbol: "J", dimensions: [2, -2, 1, 0, 0, 0, 0], complexity: 3 },
        { symbol: "W", dimensions: [2, -3, 1, 0, 0, 0, 0], complexity: 4 },
        { symbol: "C", dimensions: [0, 1, 0, 1, 0, 0, 0], complexity: 2 },
        { symbol: "V", dimensions: [2, -3, 1, -1, 0, 0, 0], complexity: 4 },
        { symbol: "F", dimensions: [-2, 4, -1, 2, 0, 0, 0], complexity: 4 },
        { symbol: "Ω", dimensions: [2, -3, 1, -2, 0, 0, 0], complexity: 5 },
        { symbol: "S", dimensions: [-2, 3, -1, 2, 0, 0, 0], complexity: 5 },
        { symbol: "Wb", dimensions: [2, -2, 1, -1, 0, 0, 0], complexity: 4 },
        { symbol: "T", dimensions: [0, -2, 1, -1, 0, 0, 0], complexity: 3 },
        { symbol: "H", dimensions: [2, -2, 1, -2, 0, 0, 0], complexity: 5 },
        { symbol: "F", dimensions: [-2, 4, -1, 2, 0, 0, 0], complexity: 5 },
        { symbol: "V", dimensions: [2, -3, 1, -1, 0, 0, 0], complexity: 5 }
    ];

    // Check if it matches a derived unit exactly
    for (const derived of derivedUnits) {
        if (derived.dimensions.every((val, idx) => val === unit[idx])) {
            return `\\mathrm{${derived.symbol}}`;
        }
    }

    // Function to calculate complexity of a representation
    function calculateComplexity(numUnits: string[], denUnits: string[]): number {
        const totalUnits = numUnits.length + denUnits.length;
        const hasFraction = denUnits.length > 0 ? 1 : 0;
        return totalUnits + hasFraction * 0.5; // Slight penalty for fractions
    }

    // Function to build unit string from base units
    function buildFromBase(dims: number[]): { num: string[]; den: string[]; complexity: number } {
        const numerator: string[] = [];
        const denominator: string[] = [];

        for (let i = 0; i < dims.length; i++) {
            const exponent = dims[i];
            if (exponent === 0) continue;

            const unitSymbol = baseUnits[i];

            if (exponent > 0) {
                if (exponent === 1) {
                    numerator.push(`\\mathrm{${unitSymbol}}`);
                } else {
                    numerator.push(`\\mathrm{${unitSymbol}}^{${exponent}}`);
                }
            } else {
                const absExponent = Math.abs(exponent);
                if (absExponent === 1) {
                    denominator.push(`\\mathrm{${unitSymbol}}`);
                } else {
                    denominator.push(`\\mathrm{${unitSymbol}}^{${absExponent}}`);
                }
            }
        }

        return {
            num: numerator,
            den: denominator,
            complexity: calculateComplexity(numerator, denominator)
        };
    }

    // Try base units first
    const baseRepresentation = buildFromBase(unit);
    let bestRepresentation = baseRepresentation;
    let bestComplexity = baseRepresentation.complexity;

    // Try combinations with one derived unit in numerator
    for (const derived of derivedUnits) {
        const remaining = unit.map((val, idx) => val - derived.dimensions[idx]);

        // Only consider if this simplifies things
        const remainingRep = buildFromBase(remaining);
        const totalNumerator = [`\\mathrm{${derived.symbol}}`, ...remainingRep.num];
        const complexity = calculateComplexity(totalNumerator, remainingRep.den);

        if (complexity < bestComplexity) {
            bestComplexity = complexity;
            bestRepresentation = { num: totalNumerator, den: remainingRep.den, complexity };
        }
    }

    // Try combinations with one derived unit in denominator
    for (const derived of derivedUnits) {
        const remaining = unit.map((val, idx) => val + derived.dimensions[idx]);

        const remainingRep = buildFromBase(remaining);
        const totalDenominator = [`\\mathrm{${derived.symbol}}`, ...remainingRep.den];
        const complexity = calculateComplexity(remainingRep.num, totalDenominator);

        if (complexity < bestComplexity) {
            bestComplexity = complexity;
            bestRepresentation = { num: remainingRep.num, den: totalDenominator, complexity };
        }
    }

    // Try ratio of two derived units (only if it significantly simplifies)
    for (const numDerived of derivedUnits) {
        for (const denDerived of derivedUnits) {
            const matches = unit.every((val, idx) => val === numDerived.dimensions[idx] - denDerived.dimensions[idx]);
            if (matches) {
                const complexity = calculateComplexity([`\\mathrm{${numDerived.symbol}}`], [`\\mathrm{${denDerived.symbol}}`]);
                if (complexity < bestComplexity) {
                    bestComplexity = complexity;
                    bestRepresentation = {
                        num: [`\\mathrm{${numDerived.symbol}}`],
                        den: [`\\mathrm{${denDerived.symbol}}`],
                        complexity
                    };
                }
            }
        }
    }

    // Handle dimensionless case
    if (bestRepresentation.num.length === 0 && bestRepresentation.den.length === 0) {
        return "1";
    }

    // Build final LaTeX string
    if (bestRepresentation.den.length === 0) {
        return bestRepresentation.num.join(" \\cdot ");
    } else if (bestRepresentation.num.length === 0) {
        return `\\frac{1}{${bestRepresentation.den.join(" \\cdot ")}}`;
    } else {
        return `\\frac{${bestRepresentation.num.join(" \\cdot ")}}{${bestRepresentation.den.join(" \\cdot ")}}`;
    }
}

export function number_to_maybe_scientific_notation(value: number) {
    // Examples
    // 0.00000005 -> 0.00000005
    // 50 -> 50
    // 500000000 -> 500000000 
    // 5000000000 -> 5\times10^{9} 
    // 5000000000 -> 5\times10^{9}
    // 5060600000 -> 5.0606\times10^{9}
    // 0.005 -> 0.005
    // 0.0005 -> 5\times10^{-4}

    const absValue = Math.abs(value);

    // Use scientific notation for very large numbers (>= 5 billion)
    // or very small numbers (< 0.0005 and > 0)
    if ((absValue >= 5e9) || (absValue < 5e-4 && absValue > 0)) {
        const exponent = Math.floor(Math.log10(absValue));
        const coefficient = value / Math.pow(10, exponent);

        // Round to avoid floating point precision issues
        // Use ~15 significant digits (JavaScript's precision limit)
        const roundedCoefficient = parseFloat(coefficient.toPrecision(15));

        // Remove trailing zeros from coefficient
        const coeffStr = roundedCoefficient.toString().replace(/\.?0+$/, '');

        return `${coeffStr}\\times10^{${exponent}}`;
    }

    return value.toString();
}

/**
 * Match formulas based on exact unit dimensions
 */
export function match_formulas_by_units(
    formulas: Formula[],
    available_expressions: MathExpression[],
    require_all_variables: boolean = false
): Formula[] {
    if (available_expressions.length === 0) {
        return formulas;
    }

    return formulas.filter((formula) => {
        const required_units = Object.values(formula.variables);

        if (require_all_variables) {
            // Check if we have ALL required variables
            return required_units.every((required_unit) =>
                available_expressions.some((expr) =>
                    units_equal(expr.unit, required_unit)
                )
            );
        } else {
            // Check if we have ANY required variables
            return required_units.some((required_unit) =>
                available_expressions.some((expr) =>
                    units_equal(expr.unit, required_unit)
                )
            );
        }
    });
}

/**
 * Match formulas where the result unit matches a target
 */
export function match_formulas_by_result(
    formulas: Formula[],
    target_unit: UnitDimension
): Formula[] {
    return formulas.filter((formula) =>
        units_equal(formula.result_unit, target_unit)
    );
}

/**
 * Find formulas that can be computed with available expressions
 */
export function find_computable_formulas(
    formulas: Formula[],
    available_expressions: MathExpression[]
): Array<{ formula: Formula; missing_variables: string[] }> {
    return formulas
        .map((formula) => {
            const required_vars = Object.keys(formula.variables);
            const available_units = available_expressions.map((e) => e.unit);

            const missing = required_vars.filter((var_name) => {
                const required_unit = formula.variables[var_name];
                return !available_units.some((unit) =>
                    units_equal(unit, required_unit)
                );
            });

            return { formula, missing_variables: missing };
        })
        .filter((result) => result.missing_variables.length === 0);
}

/**
 * Parse a unit search query string
 * Format: "q:C, r:m → F:N" or "C, m → N"
 */
export function parse_unit_query(query: string): {
    inputs: UnitDimension[];
    output?: UnitDimension;
} | null {
    // Import unit mappings
    const parts = query.split('→').map((s) => s.trim());
    const input_part = parts[0];
    const output_part = parts[1];

    // Parse input units
    const input_units: UnitDimension[] = [];
    const input_tokens = input_part.split(',').map((s) => s.trim());

    for (const token of input_tokens) {
        // Handle "var:unit" or just "unit"
        const unit_name = token.includes(':')
            ? token.split(':')[1].trim()
            : token;

        if (UNIT_NAMES[unit_name]) {
            input_units.push(UNIT_NAMES[unit_name]);
        }
    }

    // Parse output unit if present
    let output_unit: UnitDimension | undefined;
    if (output_part) {
        const output_name = output_part.includes(':')
            ? output_part.split(':')[1].trim()
            : output_part;

        if (UNIT_NAMES[output_name]) {
            output_unit = UNIT_NAMES[output_name];
        }
    }

    return input_units.length > 0 ? { inputs: input_units, output: output_unit } : null;
}

/**
 * Score formulas based on relevance to available expressions
 */
export function score_formulas(
    formulas: Formula[],
    available_expressions: MathExpression[]
): Array<{ formula: Formula; score: number }> {
    return formulas
        .map((formula) => {
            let score = 0;
            const required_units = Object.values(formula.variables);
            const available_units = available_expressions.map((e) => e.unit);

            // Count matching variables
            for (const required_unit of required_units) {
                if (
                    available_units.some((unit) => units_equal(unit, required_unit))
                ) {
                    score += 1;
                }
            }

            // Bonus for having all variables
            if (score === required_units.length) {
                score += 5;
            }

            // Bonus for simpler formulas (fewer variables)
            score += (10 - required_units.length) * 0.1;

            return { formula, score };
        })
        .sort((a, b) => b.score - a.score);
}

/**
 * Group formulas by category
 */
export function group_formulas_by_category(
    formulas: Formula[]
): { [category: string]: Formula[] } {
    const groups: { [category: string]: Formula[] } = {
        'Electric Field': [],
        'Electric Potential': [],
        'Capacitance': [],
        'Current & Resistance': [],
        'Power': [],
        'Magnetic Field': [],
        'Induction': [],
        'AC Circuits': [],
        'Other': [],
    };

    for (const formula of formulas) {
        const name = formula.name.toLowerCase();

        if (name.includes('field') && !name.includes('magnetic')) {
            groups['Electric Field'].push(formula);
        } else if (name.includes('voltage') || name.includes('potential')) {
            groups['Electric Potential'].push(formula);
        } else if (name.includes('capacit')) {
            groups['Capacitance'].push(formula);
        } else if (
            name.includes('current') ||
            name.includes('resistance') ||
            name.includes('ohm')
        ) {
            groups['Current & Resistance'].push(formula);
        } else if (name.includes('power')) {
            groups['Power'].push(formula);
        } else if (name.includes('magnetic') || name.includes('lorentz')) {
            groups['Magnetic Field'].push(formula);
        } else if (
            name.includes('induct') ||
            name.includes('faraday') ||
            name.includes('emf')
        ) {
            groups['Induction'].push(formula);
        } else if (
            name.includes('ac') ||
            name.includes('reactance') ||
            name.includes('impedance')
        ) {
            groups['AC Circuits'].push(formula);
        } else {
            groups['Other'].push(formula);
        }
    }

    // Remove empty groups
    Object.keys(groups).forEach((key) => {
        if (groups[key].length === 0) {
            delete groups[key];
        }
    });

    return groups;
}

export const PHYSICS_FORMULAS: Formula[] = [
    // Coulomb's Law
    {
        id: 'coulomb_law',
        name: "Coulomb's Law",
        latex: 'F = k \\frac{q_1 q_2}{r^2}',
        variables: {
            'q_1': DIM_COULOMB,
            'q_2': DIM_COULOMB,
            'r': DIM_METER,
        },
        result_unit: DIM_NEWTON,
        description: 'Force between two point charges',
    },
    {
        id: 'coulomb_law_vector',
        name: "Coulomb's Law (Vector Form)",
        latex: '\\vec{F} = k \\frac{q_1 q_2}{r^2} \\hat{r}',
        variables: {
            'q_1': DIM_COULOMB,
            'q_2': DIM_COULOMB,
            'r': DIM_METER,
        },
        result_unit: DIM_NEWTON,
        description: 'Vector form of Coulomb force',
    },

    // Electric Field
    {
        id: 'electric_field_force',
        name: 'Electric Field from Force',
        latex: 'E = \\frac{F}{q}',
        variables: {
            'F': DIM_NEWTON,
            'q': DIM_COULOMB,
        },
        result_unit: divide_units(DIM_NEWTON, DIM_COULOMB),
        description: 'Electric field strength',
    },
    {
        id: 'electric_field_point_charge',
        name: 'Electric Field (Point Charge)',
        latex: 'E = k \\frac{q}{r^2}',
        variables: {
            'q': DIM_COULOMB,
            'r': DIM_METER,
        },
        result_unit: divide_units(DIM_NEWTON, DIM_COULOMB),
        description: 'Electric field from point charge',
    },
    {
        id: 'electric_field_voltage',
        name: 'Electric Field from Voltage',
        latex: 'E = \\frac{V}{d}',
        variables: {
            'V': DIM_VOLT,
            'd': DIM_METER,
        },
        result_unit: divide_units(DIM_VOLT, DIM_METER),
        description: 'Uniform electric field',
    },

    // Electric Potential Energy
    {
        id: 'electric_potential_energy',
        name: 'Electric Potential Energy',
        latex: 'U = k \\frac{q_1 q_2}{r}',
        variables: {
            'q_1': DIM_COULOMB,
            'q_2': DIM_COULOMB,
            'r': DIM_METER,
        },
        result_unit: DIM_JOULE,
        description: 'Potential energy of two charges',
    },
    {
        id: 'potential_energy_voltage',
        name: 'Potential Energy from Voltage',
        latex: 'U = qV',
        variables: {
            'q': DIM_COULOMB,
            'V': DIM_VOLT,
        },
        result_unit: DIM_JOULE,
        description: 'Potential energy of charge in field',
    },

    // Electric Potential (Voltage)
    {
        id: 'voltage_point_charge',
        name: 'Voltage (Point Charge)',
        latex: 'V = k \\frac{q}{r}',
        variables: {
            'q': DIM_COULOMB,
            'r': DIM_METER,
        },
        result_unit: DIM_VOLT,
        description: 'Electric potential from point charge',
    },
    {
        id: 'voltage_energy',
        name: 'Voltage from Energy',
        latex: 'V = \\frac{U}{q}',
        variables: {
            'U': DIM_JOULE,
            'q': DIM_COULOMB,
        },
        result_unit: DIM_VOLT,
        description: 'Electric potential',
    },
    {
        id: 'voltage_field',
        name: 'Voltage from Field',
        latex: 'V = Ed',
        variables: {
            'E': divide_units(DIM_VOLT, DIM_METER),
            'd': DIM_METER,
        },
        result_unit: DIM_VOLT,
        description: 'Voltage in uniform field',
    },

    // Capacitance
    {
        id: 'capacitance_def',
        name: 'Capacitance Definition',
        latex: 'C = \\frac{Q}{V}',
        variables: {
            'Q': DIM_COULOMB,
            'V': DIM_VOLT,
        },
        result_unit: DIM_FARAD,
        description: 'Capacitance',
    },
    {
        id: 'parallel_plate_capacitor',
        name: 'Parallel Plate Capacitor',
        latex: 'C = \\epsilon_0 \\frac{A}{d}',
        variables: {
            'A': power_unit(DIM_METER, 2),
            'd': DIM_METER,
        },
        result_unit: DIM_FARAD,
        description: 'Capacitance of parallel plates',
    },
    {
        id: 'capacitor_energy',
        name: 'Capacitor Energy',
        latex: 'U = \\frac{1}{2}CV^2',
        variables: {
            'C': DIM_FARAD,
            'V': DIM_VOLT,
        },
        result_unit: DIM_JOULE,
        description: 'Energy stored in capacitor',
    },
    {
        id: 'capacitor_energy_charge',
        name: 'Capacitor Energy (Charge)',
        latex: 'U = \\frac{Q^2}{2C}',
        variables: {
            'Q': DIM_COULOMB,
            'C': DIM_FARAD,
        },
        result_unit: DIM_JOULE,
        description: 'Energy in terms of charge',
    },
    {
        id: 'capacitor_energy_qv',
        name: 'Capacitor Energy (Q-V)',
        latex: 'U = \\frac{1}{2}QV',
        variables: {
            'Q': DIM_COULOMB,
            'V': DIM_VOLT,
        },
        result_unit: DIM_JOULE,
        description: 'Energy in terms of Q and V',
    },

    // Capacitors in Series/Parallel
    {
        id: 'capacitors_series',
        name: 'Capacitors in Series',
        latex: '\\frac{1}{C_{eq}} = \\frac{1}{C_1} + \\frac{1}{C_2}',
        variables: {
            'C_1': DIM_FARAD,
            'C_2': DIM_FARAD,
        },
        result_unit: DIM_FARAD,
        description: 'Equivalent capacitance (series)',
    },
    {
        id: 'capacitors_parallel',
        name: 'Capacitors in Parallel',
        latex: 'C_{eq} = C_1 + C_2',
        variables: {
            'C_1': DIM_FARAD,
            'C_2': DIM_FARAD,
        },
        result_unit: DIM_FARAD,
        description: 'Equivalent capacitance (parallel)',
    },

    // Current and Resistance
    {
        id: 'current_def',
        name: 'Current Definition',
        latex: 'I = \\frac{Q}{t}',
        variables: {
            'Q': DIM_COULOMB,
            't': DIM_SECOND,
        },
        result_unit: DIM_AMPERE,
        description: 'Electric current',
    },
    {
        id: 'current_drift',
        name: 'Current (Drift Velocity)',
        latex: 'I = nqv_d A',
        variables: {
            'n': divide_units(DIM_DIMENSIONLESS, power_unit(DIM_METER, 3)),
            'q': DIM_COULOMB,
            'v_d': divide_units(DIM_METER, DIM_SECOND),
            'A': power_unit(DIM_METER, 2),
        },
        result_unit: DIM_AMPERE,
        description: 'Current from drift velocity',
    },
    {
        id: 'ohms_law',
        name: "Ohm's Law",
        latex: 'V = IR',
        variables: {
            'I': DIM_AMPERE,
            'R': DIM_OHM,
        },
        result_unit: DIM_VOLT,
        description: "Ohm's law",
    },
    {
        id: 'resistance_def',
        name: 'Resistance',
        latex: 'R = \\frac{V}{I}',
        variables: {
            'V': DIM_VOLT,
            'I': DIM_AMPERE,
        },
        result_unit: DIM_OHM,
        description: 'Electrical resistance',
    },
    {
        id: 'resistance_material',
        name: 'Resistance (Material)',
        latex: 'R = \\rho \\frac{L}{A}',
        variables: {
            'L': DIM_METER,
            'A': power_unit(DIM_METER, 2),
        },
        result_unit: DIM_OHM,
        description: 'Resistance from geometry',
    },

    // Power
    {
        id: 'power_vi',
        name: 'Electric Power (V-I)',
        latex: 'P = VI',
        variables: {
            'V': DIM_VOLT,
            'I': DIM_AMPERE,
        },
        result_unit: DIM_WATT,
        description: 'Electrical power',
    },
    {
        id: 'power_i2r',
        name: 'Electric Power (I²R)',
        latex: 'P = I^2 R',
        variables: {
            'I': DIM_AMPERE,
            'R': DIM_OHM,
        },
        result_unit: DIM_WATT,
        description: 'Power dissipation',
    },
    {
        id: 'power_v2r',
        name: 'Electric Power (V²/R)',
        latex: 'P = \\frac{V^2}{R}',
        variables: {
            'V': DIM_VOLT,
            'R': DIM_OHM,
        },
        result_unit: DIM_WATT,
        description: 'Power from voltage',
    },

    // Resistors in Series/Parallel
    {
        id: 'resistors_series',
        name: 'Resistors in Series',
        latex: 'R_{eq} = R_1 + R_2',
        variables: {
            'R_1': DIM_OHM,
            'R_2': DIM_OHM,
        },
        result_unit: DIM_OHM,
        description: 'Equivalent resistance (series)',
    },
    {
        id: 'resistors_parallel',
        name: 'Resistors in Parallel',
        latex: '\\frac{1}{R_{eq}} = \\frac{1}{R_1} + \\frac{1}{R_2}',
        variables: {
            'R_1': DIM_OHM,
            'R_2': DIM_OHM,
        },
        result_unit: DIM_OHM,
        description: 'Equivalent resistance (parallel)',
    },

    // RC Circuits
    {
        id: 'rc_time_constant',
        name: 'RC Time Constant',
        latex: '\\tau = RC',
        variables: {
            'R': DIM_OHM,
            'C': DIM_FARAD,
        },
        result_unit: DIM_SECOND,
        description: 'Time constant for RC circuit',
    },
    {
        id: 'rc_charge',
        name: 'RC Circuit Charging',
        latex: 'Q(t) = Q_0(1 - e^{-t/RC})',
        variables: {
            'Q_0': DIM_COULOMB,
            't': DIM_SECOND,
            'R': DIM_OHM,
            'C': DIM_FARAD,
        },
        result_unit: DIM_COULOMB,
        description: 'Charge vs time (charging)',
    },
    {
        id: 'rc_discharge',
        name: 'RC Circuit Discharging',
        latex: 'Q(t) = Q_0 e^{-t/RC}',
        variables: {
            'Q_0': DIM_COULOMB,
            't': DIM_SECOND,
            'R': DIM_OHM,
            'C': DIM_FARAD,
        },
        result_unit: DIM_COULOMB,
        description: 'Charge vs time (discharging)',
    },

    // Magnetic Field
    {
        id: 'magnetic_force_charge',
        name: 'Magnetic Force on Charge',
        latex: 'F = qvB\\sin\\theta',
        variables: {
            'q': DIM_COULOMB,
            'v': divide_units(DIM_METER, DIM_SECOND),
            'B': DIM_TESLA,
        },
        result_unit: DIM_NEWTON,
        description: 'Lorentz force',
    },
    {
        id: 'magnetic_force_current',
        name: 'Magnetic Force on Current',
        latex: 'F = ILB\\sin\\theta',
        variables: {
            'I': DIM_AMPERE,
            'L': DIM_METER,
            'B': DIM_TESLA,
        },
        result_unit: DIM_NEWTON,
        description: 'Force on current-carrying wire',
    },
    {
        id: 'cyclotron_radius',
        name: 'Cyclotron Radius',
        latex: 'r = \\frac{mv}{qB}',
        variables: {
            'm': power_unit(DIM_METER, 0), // This should be kg, but keeping consistent
            'v': divide_units(DIM_METER, DIM_SECOND),
            'q': DIM_COULOMB,
            'B': DIM_TESLA,
        },
        result_unit: DIM_METER,
        description: 'Radius of charged particle in B field',
    },

    // Biot-Savart Law and Ampere's Law
    {
        id: 'magnetic_field_wire',
        name: 'Magnetic Field (Long Wire)',
        latex: 'B = \\frac{\\mu_0 I}{2\\pi r}',
        variables: {
            'I': DIM_AMPERE,
            'r': DIM_METER,
        },
        result_unit: DIM_TESLA,
        description: 'B field from straight wire',
    },
    {
        id: 'magnetic_field_solenoid',
        name: 'Magnetic Field (Solenoid)',
        latex: 'B = \\mu_0 n I',
        variables: {
            'n': divide_units(DIM_DIMENSIONLESS, DIM_METER),
            'I': DIM_AMPERE,
        },
        result_unit: DIM_TESLA,
        description: 'B field inside solenoid',
    },
    {
        id: 'magnetic_field_loop',
        name: 'Magnetic Field (Loop Center)',
        latex: 'B = \\frac{\\mu_0 I}{2R}',
        variables: {
            'I': DIM_AMPERE,
            'R': DIM_METER,
        },
        result_unit: DIM_TESLA,
        description: 'B field at center of current loop',
    },

    // Faraday's Law and Induction
    {
        id: 'magnetic_flux',
        name: 'Magnetic Flux',
        latex: '\\Phi_B = BA\\cos\\theta',
        variables: {
            'B': DIM_TESLA,
            'A': power_unit(DIM_METER, 2),
        },
        result_unit: DIM_WEBER,
        description: 'Magnetic flux',
    },
    {
        id: 'faraday_law',
        name: "Faraday's Law",
        latex: '\\mathcal{E} = -\\frac{d\\Phi_B}{dt}',
        variables: {
            'Phi_B': DIM_WEBER,
            't': DIM_SECOND,
        },
        result_unit: DIM_VOLT,
        description: 'Induced EMF',
    },
    {
        id: 'motional_emf',
        name: 'Motional EMF',
        latex: '\\mathcal{E} = BLv',
        variables: {
            'B': DIM_TESLA,
            'L': DIM_METER,
            'v': divide_units(DIM_METER, DIM_SECOND),
        },
        result_unit: DIM_VOLT,
        description: 'EMF from moving conductor',
    },

    // Inductance
    {
        id: 'inductance_def',
        name: 'Inductance Definition',
        latex: 'L = \\frac{\\Phi_B}{I}',
        variables: {
            'Phi_B': DIM_WEBER,
            'I': DIM_AMPERE,
        },
        result_unit: DIM_HENRY,
        description: 'Self-inductance',
    },
    {
        id: 'solenoid_inductance',
        name: 'Solenoid Inductance',
        latex: 'L = \\mu_0 n^2 A l',
        variables: {
            'n': divide_units(DIM_DIMENSIONLESS, DIM_METER),
            'A': power_unit(DIM_METER, 2),
            'l': DIM_METER,
        },
        result_unit: DIM_HENRY,
        description: 'Inductance of solenoid',
    },
    {
        id: 'inductor_emf',
        name: 'Inductor EMF',
        latex: '\\mathcal{E} = -L\\frac{dI}{dt}',
        variables: {
            'L': DIM_HENRY,
            'I': DIM_AMPERE,
            't': DIM_SECOND,
        },
        result_unit: DIM_VOLT,
        description: 'EMF across inductor',
    },
    {
        id: 'inductor_energy',
        name: 'Inductor Energy',
        latex: 'U = \\frac{1}{2}LI^2',
        variables: {
            'L': DIM_HENRY,
            'I': DIM_AMPERE,
        },
        result_unit: DIM_JOULE,
        description: 'Energy stored in inductor',
    },

    // RL Circuits
    {
        id: 'rl_time_constant',
        name: 'RL Time Constant',
        latex: '\\tau = \\frac{L}{R}',
        variables: {
            'L': DIM_HENRY,
            'R': DIM_OHM,
        },
        result_unit: DIM_SECOND,
        description: 'Time constant for RL circuit',
    },
    {
        id: 'rl_current_growth',
        name: 'RL Circuit (Current Growth)',
        latex: 'I(t) = I_0(1 - e^{-Rt/L})',
        variables: {
            'I_0': DIM_AMPERE,
            't': DIM_SECOND,
            'R': DIM_OHM,
            'L': DIM_HENRY,
        },
        result_unit: DIM_AMPERE,
        description: 'Current growth in RL circuit',
    },
    {
        id: 'rl_current_decay',
        name: 'RL Circuit (Current Decay)',
        latex: 'I(t) = I_0 e^{-Rt/L}',
        variables: {
            'I_0': DIM_AMPERE,
            't': DIM_SECOND,
            'R': DIM_OHM,
            'L': DIM_HENRY,
        },
        result_unit: DIM_AMPERE,
        description: 'Current decay in RL circuit',
    },

    // LC and RLC Circuits
    {
        id: 'lc_frequency',
        name: 'LC Oscillation Frequency',
        latex: '\\omega = \\frac{1}{\\sqrt{LC}}',
        variables: {
            'L': DIM_HENRY,
            'C': DIM_FARAD,
        },
        result_unit: divide_units(DIM_DIMENSIONLESS, DIM_SECOND),
        description: 'Angular frequency of LC circuit',
    },
    {
        id: 'lc_period',
        name: 'LC Oscillation Period',
        latex: 'T = 2\\pi\\sqrt{LC}',
        variables: {
            'L': DIM_HENRY,
            'C': DIM_FARAD,
        },
        result_unit: DIM_SECOND,
        description: 'Period of LC oscillation',
    },

    // AC Circuits
    {
        id: 'capacitive_reactance',
        name: 'Capacitive Reactance',
        latex: 'X_C = \\frac{1}{\\omega C}',
        variables: {
            'omega': divide_units(DIM_DIMENSIONLESS, DIM_SECOND),
            'C': DIM_FARAD,
        },
        result_unit: DIM_OHM,
        description: 'Capacitive reactance',
    },
    {
        id: 'inductive_reactance',
        name: 'Inductive Reactance',
        latex: 'X_L = \\omega L',
        variables: {
            'omega': divide_units(DIM_DIMENSIONLESS, DIM_SECOND),
            'L': DIM_HENRY,
        },
        result_unit: DIM_OHM,
        description: 'Inductive reactance',
    },
    {
        id: 'impedance',
        name: 'AC Impedance',
        latex: 'Z = \\sqrt{R^2 + (X_L - X_C)^2}',
        variables: {
            'R': DIM_OHM,
            'X_L': DIM_OHM,
            'X_C': DIM_OHM,
        },
        result_unit: DIM_OHM,
        description: 'Impedance in RLC circuit',
    },
    {
        id: 'resonance_frequency',
        name: 'Resonance Frequency',
        latex: '\\omega_0 = \\frac{1}{\\sqrt{LC}}',
        variables: {
            'L': DIM_HENRY,
            'C': DIM_FARAD,
        },
        result_unit: divide_units(DIM_DIMENSIONLESS, DIM_SECOND),
        description: 'Resonance frequency',
    },

    // Energy Density
    {
        id: 'electric_energy_density',
        name: 'Electric Energy Density',
        latex: 'u_E = \\frac{1}{2}\\epsilon_0 E^2',
        variables: {
            'E': divide_units(DIM_VOLT, DIM_METER),
        },
        result_unit: divide_units(DIM_JOULE, power_unit(DIM_METER, 3)),
        description: 'Energy density in electric field',
    },
    {
        id: 'magnetic_energy_density',
        name: 'Magnetic Energy Density',
        latex: 'u_B = \\frac{B^2}{2\\mu_0}',
        variables: {
            'B': DIM_TESLA,
        },
        result_unit: divide_units(DIM_JOULE, power_unit(DIM_METER, 3)),
        description: 'Energy density in magnetic field',
    },
];
