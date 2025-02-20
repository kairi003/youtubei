import { HTTP, Shelf } from "../../common";
import { BASE_URL, INNERTUBE_API_KEY, INNERTUBE_CLIENT_VERSION, I_END_POINT } from "../constants";
import { MusicAlbumCompact } from "../MusicAlbumCompact";
import { MusicArtistCompact } from "../MusicArtistCompact";
import { MusicLyrics } from "../MusicLyrics";
import { MusicPlaylistCompact } from "../MusicPlaylistCompact";
import { MusicVideoCompact } from "../MusicVideoCompact";
import { MusicSearchResultParser } from "./MusicSearchResultParser";

export type MusicClientOptions = {
	initialCookie: string;
	/** Optional options for http client */
	fetchOptions: Partial<RequestInit>;
	/** Optional options passed when sending a request to youtube (context.client) */
	youtubeClientOptions: Record<string, unknown>;
};

/** Youtube Music Client */
export class MusicClient {
	/** @hidden */
	http: HTTP;

	constructor(options: Partial<MusicClientOptions> = {}) {
		const fullOptions: MusicClientOptions = {
			initialCookie: "",
			fetchOptions: {},
			...options,
			youtubeClientOptions: {
				hl: "en",
				gl: "US",
				...options.youtubeClientOptions,
			},
		};

		this.http = new HTTP({
			apiKey: INNERTUBE_API_KEY,
			baseUrl: BASE_URL,
			clientName: "WEB_REMIX",
			clientVersion: INNERTUBE_CLIENT_VERSION,
			...fullOptions,
		});
	}

	/**
	 * Searches for video, song, album, playlist, or artist
	 *
	 * @param query The search query
	 * @param options Search options
	 *
	 */
	async search(
		query: string
	): Promise<
		Shelf<
			| MusicVideoCompact[]
			| MusicAlbumCompact[]
			| MusicPlaylistCompact[]
			| MusicArtistCompact[]
		>[]
	> {
		const response = await this.http.post(`${I_END_POINT}/search`, {
			data: { query },
		});

		return MusicSearchResultParser.parseSearchResult(response.data, this);
	}

	/**
	 * Get lyrics of a song
	 *
	 * @param query The search query
	 * @param options Search options
	 *
	 */
	async getLyrics(id: string): Promise<MusicLyrics | undefined> {
		// get watch page data to obtain lyric browse id
		const watchResponse = await this.http.post(`${I_END_POINT}/next`, {
			data: { videoId: id },
		});

		const lyricTab =
			watchResponse.data.contents.singleColumnMusicWatchNextResultsRenderer.tabbedRenderer
				.watchNextTabbedResultsRenderer.tabs[1].tabRenderer;

		if (lyricTab.unselectable) return undefined;

		// get lyric data with browse id
		const lyricsBrowseId = lyricTab.endpoint.browseEndpoint.browseId;
		const lyricResponse = await this.http.post(`${I_END_POINT}/browse`, {
			data: { browseId: lyricsBrowseId },
		});

		const data =
			lyricResponse.data.contents.sectionListRenderer.contents[0]
				.musicDescriptionShelfRenderer;

		const content = data.description.runs[0].text;
		const description = data.footer.runs[0].text;

		return new MusicLyrics({
			content,
			description,
		});
	}
}
