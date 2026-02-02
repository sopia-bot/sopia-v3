import Vue from 'vue';
import Vuex from 'vuex';

import { User } from '@sopia-bot/core';

Vue.use(Vuex);

interface State {
	user?: User;
	sideopen: boolean;
	loginDialog: boolean;
	partners: User[];
	sponsors: any[];
	liked: boolean;
}

export default new Vuex.Store({
	state: {
		user: {
			id: 0,
			nickname: 'SOPIA User',
			tag: 'SOPIA User',
			profile_url: require('assets/default-profile.png'),
		} as User,
		sideopen: false,
		loginDialog: false,
		partners: [],
		sponsors: [],
		liked: false,
	},
	getters: {
		user(state: State) {
			return state.user;
		},
		streamingPartners(state: State): User[] {
			return state.partners.filter((partner) => !!partner.current_live?.id) || [];
		},
		isSponsor(): boolean {
			return false;
		},
	},
	mutations: {
		user(state: State, user: User) {
			state.user = user;
		},
		partners(state: State, list: User[]) {
			state.partners = list;
		},
	},
	actions: {
	},
	modules: {
	},
});
