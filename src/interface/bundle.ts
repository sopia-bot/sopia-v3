export interface BundlePackage {
	name: string;
	version: string;
	description: string;
	page: string;
	pageRoot: string;
	'page-version': number;
	icon: string;
	idx: number;
	owner: number;
	owner_name: string;
	is_official: boolean;
	debug: boolean;
	dependencies: Record<string, string>;
}

export default {};
