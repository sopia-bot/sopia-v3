export class SopiaAPI {

	public user: any = {};

	public protocol: string = 'https';
	public host: string = 'api.sopia.dev';

	get ApiURL() {
		return `${this.protocol}://${this.host}`;
	}

	public async login(id: string, pw: string) {
		return this.user;
	}

	public async setUserInfo(data: any) {
		return { error: false, data: [] };
	}

	public async activityLog(tag: string, data: string = '') {
		return { error: false, data: [] };
	}

	public async req(method: string, url: string, data: any = {}): Promise<any> {
		return { error: false, data: [{}] };
	}

}
