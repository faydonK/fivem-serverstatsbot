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
				headers: { 
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
					'Accept': 'application/json',
					'Accept-Language': 'en-US,en;q=0.9',
					'Cache-Control': 'no-cache',
					'Pragma': 'no-cache'
				},
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
			
			// Check if we have valid server data
			if (stats && stats.Data) {
				// Server online - even if some fields are missing
				if (!this.online) {
					this.online = true;
					console.log('Server is now ONLINE');
				}
				
				// Use fallback values if fields are missing
				this.maxPlayers = stats.Data.sv_maxclients || stats.Data.svMaxclients || 32;
				this.currentCount = stats.Data.clients || stats.Data.selfReportedClients || 0;
				
				console.log('Updated stats:', {
					online: this.online,
					current: this.currentCount,
					max: this.maxPlayers
				});
				
				// Update bot status when stats change
				if (this.botInstance) {
					this.botInstance.updateBotStatus();
				}
				return;
			} else {
				console.log('Invalid server data structure received');
				throw new Error('Invalid server data');
			}
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
