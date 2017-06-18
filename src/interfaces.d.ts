import { ProjectFileType } from '@dojo/cli-export-project/interfaces/project.json';
import { Diagnostic, EmitOutput, LanguageService, QuickInfo } from 'typescript';

export interface EmitFile {
	name: string;
	text: string;
	type: ProjectFileType;
}

export interface PromiseLanguageService {
	getSyntacticDiagnostics(fileName: string): Promise<Diagnostic[]>;
	getSemanticDiagnostics(fileName: string): Promise<Diagnostic[]>;
	getCompilerOptionsDiagnostics(): Promise<Diagnostic[]>;
	getEmitOutput(fileName: string, emitOnlyDtsFiles?: boolean): Promise<EmitOutput>;
	getQuickInfoAtPosition(fileName: string, position: number): Promise<QuickInfo>;
}

export interface TypeScriptWorker {
	(...uri: monaco.Uri[]): Promise<PromiseLanguageService>;
}
