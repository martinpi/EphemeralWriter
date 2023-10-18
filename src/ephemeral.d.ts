declare module "ephemeral-writer" {
    interface Settings {
        raw?: string | undefined;
        type?: number | undefined;
        scratch?: { [key: string]: string } | undefined;
    }
    class ArrayWithErrors<T> extends Array<T> {
        errors: string[];
    }
    class EphemeralNode {
        errors: string[];
        expansionErrors: string[];
        grammar: Grammar;
        parent: EphemeralNode | null;
        depth: number;
        childIndex: number;
        isExpanded: boolean;
        children: EphemeralNode[];
        finishedText?: string | undefined;
        childRule: string;
        raw: string | undefined;
        type: number | undefined;
        symbol: string;
        modifiers: string[];
        preactions: EphemeralNodeAction[];
        postactions: EphemeralNodeAction[];
        action?: EphemeralNodeAction | undefined;
        scratch?: { [key: string]: string } | undefined;
        constructor(parent: EphemeralNode | Grammar | null, childIndex: number, settings: Settings);
        toString(): string;
        expandChildren(childRule: string, preventRecursion: boolean): void;
        expand(preventRecursion?: boolean): void;
        clearEscapeChars(): void;
    }
    class EphemeralNodeAction {
        node: EphemeralNode;
        type: 0 | 1 | 2 | 3;
        target: string;
        rule: string;
        ruleSections: string[];
        finishedRules: string[];
        constructor(node: EphemeralNode, raw: string);
        createUndo(): EphemeralNodeAction;
        activate(): void;
        toText(): string;
    }
    class RuleSet {
        grammar: Grammar;
        raw: string | string[];
        falloff: number;
        defaultRules: string[];
        defaultUses?: number[] | undefined;
        conditionalRule?: string | undefined;
        conditionalValues?: RuleSet[] | undefined;
        shuffledDeck?: number[] | undefined;
        constructor(grammar: Grammar, raw: string | string[]);
        selectRule(errors?: string[]): any;
        clearState(): void;
    }
    class Symbol {
        grammar: Grammar;
        key: string;
        rawRules: ConstructorParameters<typeof RuleSet>[1];
        baseRules: RuleSet;
        stack?: RuleSet[] | undefined;
        uses?:
            | Array<{
                node?: EphemeralNode | undefined;
            }>
            | undefined;
        isDynamic?: boolean | undefined;
        constructor(grammar: Grammar, key: string, rawRules: ConstructorParameters<typeof RuleSet>[1]);
        clearState(): void;
        pushRules(rawRules: ConstructorParameters<typeof RuleSet>[1]): void;
        popRules(): void;
        selectRule(node?: EphemeralNode, errors?: string[]): any;
        getActiveRules(): any;
        rulesToJSON(): string;
    }
    type Modifiers = Record<string, (s: string, params: string[]) => string>;
    class Grammar {
        modifiers: Modifiers;
        symbols: Partial<Record<string, Symbol>>;
        raw: Record<string, string | string[]>;
        subgrammars: Grammar[];
        errors?: string[] | undefined;
        constructor(raw: Record<string, string | string[]> | string);
        clearState(): void;
        addModifiers(mods: Modifiers): void;
        loadFromRawObj(raw: Record<string, string | string[]>): void;
        loadFromStringObj(raw: string): void;
        createRoot(rule: string): EphemeralNode;
        expand(rule: string, allowEscapeChars?: boolean, scratch?: { [key: string]: string }): EphemeralNode;
        flatten(rule: string, allowEscapeChars?: boolean, scratch?: { [key: string]: string }): string;
        toJSON(): string;
        pushRules(key: string, rawRules: ConstructorParameters<typeof Symbol>[2], sourceAction?: boolean): void;
        popRules(key: string): void;
        selectRule(key: string, node: EphemeralNode, errors: string[]): any;
    }
    const ephemeral: {
        createGrammar: (raw: ConstructorParameters<typeof Grammar>[0]) => Grammar;
        parseTag: (tagContents: string | null) => {
            symbol: any;
            preactions: any[];
            postactions: any[];
            modifiers: any[];
        };
        parse: (rule: string | null) => ArrayWithErrors<Settings>;
        baseEngModifiers: {
            replace: (s: string, params: string[]) => string;
            capitalizeAll: (s: string) => string;
            capitalize: (s: string) => string;
            caps: (s: string) => string;
            a: (s: string) => string;
            firstS: (s: string) => string;
            s: (s: string) => string;
            ed: (s: string) => string;
            inQuotes: (s: string) => string;
            comma: (s: string) => string;
            title: (s: string) => string;
        };
        EphemeralNode: typeof EphemeralNode;
        Grammar: typeof Grammar;
        Symbol: typeof Symbol;
        RuleSet: typeof RuleSet;
    };
    export = ephemeral;
}
