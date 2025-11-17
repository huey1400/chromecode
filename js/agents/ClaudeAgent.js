class ClaudeAgent extends Agent {

	constructor( apiKey ) {

		super( {
			apiKey: apiKey,
			responseType: 'CLAUDE_RESPONSE',
			callType: 'CALL_CLAUDE',
			timeout: 30000
		} );

	}

}
