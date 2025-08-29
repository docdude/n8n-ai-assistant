import type {
	AiApplySuggestionRequestDto,
	AiAskRequestDto,
	AiChatRequestDto,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { Logger } from '@n8n/logger';
import type { IUser } from 'n8n-workflow';

@Service()
export class LocalAiService {
	private ollamaBaseUrl: string;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
		// Use the configured Ollama URL from environment
		this.ollamaBaseUrl = this.globalConfig.aiAssistant.baseUrl || 'http://ollama:11434';
	}

	async chat(payload: AiChatRequestDto, user: IUser) {
		try {
			this.logger.debug('Local AI chat request', { userId: user.id });

			// Convert n8n chat format to Ollama chat format
			const ollamaPayload = {
				model: 'llama3.2:3b', // Use available model
				messages: payload.messages.map((msg) => ({
					role: msg.role,
					content: msg.content,
				})),
				stream: true,
			};

			const response = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(ollamaPayload),
			});

			if (!response.ok) {
				throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
			}

			// Return a streaming response compatible with n8n's expected format
			return {
				body: response.body,
			};
		} catch (error) {
			this.logger.error('Local AI chat error', { error: error.message, userId: user.id });
			throw error;
		}
	}

	async applySuggestion(payload: AiApplySuggestionRequestDto, user: IUser) {
		// For now, return a simple response - can be enhanced later
		this.logger.debug('Local AI apply suggestion request', { userId: user.id });
		return {
			success: true,
			message: 'Suggestion applied (local AI)',
		};
	}

	async askAi(payload: AiAskRequestDto, user: IUser) {
		try {
			this.logger.debug('Local AI ask request', { userId: user.id });

			// Convert to simple Ollama generate request
			const ollamaPayload = {
				model: 'llama3.2:3b',
				prompt: `${payload.question}\n\nContext: ${JSON.stringify(payload.context || {})}`,
				stream: false,
			};

			const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(ollamaPayload),
			});

			if (!response.ok) {
				throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
			}

			const result = await response.json();

			return {
				response: result.response || 'No response from AI',
			};
		} catch (error) {
			this.logger.error('Local AI ask error', { error: error.message, userId: user.id });
			throw error;
		}
	}

	async createFreeAiCredits(user: IUser) {
		// Return mock credentials for local usage
		this.logger.debug('Local AI create free credits request', { userId: user.id });
		return {
			id: 'local-ai-credits',
			name: 'Local AI (Unlimited)',
			type: 'localAi',
			data: {
				provider: 'ollama',
				baseUrl: this.ollamaBaseUrl,
			},
		};
	}
}
