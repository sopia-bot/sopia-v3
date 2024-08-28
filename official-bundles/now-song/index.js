const path = window.require('path');
const { execSync } = window.require('child_process');
const iconv = window.require(path.join(__dirname, './node_modules/iconv-lite'));

let lastSong = '';


function getMelonCaptionExec() {
	try {
		const buf = execSync('powershell.exe -Command "Get-Process \\"Melon Player\\" | Format-List -Property MainWindowTitle "');
		const line = iconv.decode(buf, 'euc-kr');
		const caption = line.split('\n').find((s) => s.replace('MainWindowTitle : ', '').trim())
			.replace('MainWindowTitle : ', '').trim();
		return caption;
	} catch (e) {
		return e.message;
	}
}

window.getNowSongInfo = (sock) => {
	let caption = getMelonCaptionExec();

	if ( !caption ) {
		const { getNowSong } = window.require(path.join(__dirname, './song.node'));
		const caption = getNowSong().trim();
		if ( caption === '' ) {
			return;
		}

		if ( caption.includes('ActiveMovie Window') ) {
			sock.message('멜론 플레이어를 한 번 클릭해 주세요.');
			return;
		}

		caption = caption.replace(/ - melon$/i, '').trim();
	}
	try {
		let [ song, title, singer ] = caption.match(/(.*?) - (.*)/);
		return { title, singer };
	} catch(err) {
		console.error(err);
	}
}

exports.live_message = function(evt, sock) {
	const message = evt.update_component.message.value;
	let [ cmd ] = message.split(' ');
	let name = '';

	if ( cmd === '!현재곡' ) {
		const song = getNowSongInfo(sock);

		if ( !song ) {
			sock.message("현재 곡 정보를 가져올 수 없습니다.");
			return;
		}

		sock.message(`🔊현재 곡 정보🎶\\n${song.title} - ${song.singer}`);
	}
};