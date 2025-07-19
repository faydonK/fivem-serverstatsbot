import type { CFXServerAPIData } from '~/types';

export default class {
	private static id: string;
	private static serverList = 'https://servers-frontend.fivem.net/api/servers/single/';
	private static botInstance: any;
	static serverName: string;
	static maxPlayers: number;
	static currentCount: number;
	static online = false;
	static interval: number;
	/**
	 * Set the bot instance to update status when stats change.
	 * @param bot Bot instance
	 */
	static setBotInstance(bot: any): void {
		this.botInstance = bot;
	}
	/**
	 * ! Can only monitor 1 server at a time currently.
	 *
	 * Starts the server class and populates the provided server data.
	 * @param serverID {string} CFX server id.
	 * @returns {Promise<void>} void.
	 */
	static async init(serverID: string): Promise<void> {
		this.id = serverID;
		this.serverName = process.env.FIVEM_SERVER_NAME;
		this.interval = Number(process.env.BOT_CHECKSTATUS_INTERVAL);
		console.log('Server module initialized with:');
		console.log('- Server ID:', this.id);
		console.log('- Server Name:', this.serverName);
		console.log('- Update Interval:', this.interval, 'seconds');
		// Set initial server stats.
		await this.getStats();
		// Start update interval.
		setInterval(() => {
			void this.getStats();
		}, this.interval * 1000);
	}
	/**
	 * Check for and update the server stats.
	 * @returns {Promise<void>} void
	 */
	static async getStats(): Promise<void> {
		console.log('Fetching server stats...');
		console.log('Server ID:', this.id);
		console.log('API URL:', this.serverList + this.id);
		// Fetch stats.
		try {
			const response = await fetch(this.serverList + this.id, {
				headers: { 'User-Agent': 'cfx' },
			});
			
			console.log('Response status:', response.status);
			console.log('Response ok:', response.ok);
			
			if (!response.ok) {
				console.error('API request failed with status:', response.status);
				throw new Error(`HTTP ${response.status}`);
			}
			
			const stats = await response.json() as CFXServerAPIData;
			console.log('Server data received:', {
				hostname: stats.Data?.hostname,
				clients: stats.Data?.clients,
				maxClients: stats.Data?.sv_maxclients
			});
			
			// Server online.
			if (!this.online) {
				this.online = true;
				console.log('Server is now ONLINE');
			}
			this.maxPlayers = stats.Data.sv_maxclients;
			this.currentCount = stats.Data.clients;
			// Update bot status when stats change
			if (this.botInstance) {
				this.botInstance.updateBotStatus();
			}
			return;
		} catch (error) {
			console.error('Error fetching server stats:', error);
		}
		
		// Server not online / not found.
		// If server is online, but bot isn't registering it as online...then your invite id may be wrong.
		if (this.online) {
			this.online = false;
			console.log('Server is now OFFLINE');
		}
		this.maxPlayers = 0;
		this.currentCount = 0;
		// Update bot status when server goes offline
		if (this.botInstance) {
			this.botInstance.updateBotStatus();
		}
	}
}
