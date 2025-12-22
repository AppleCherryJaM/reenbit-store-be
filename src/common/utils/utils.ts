export const timeConverter = (expiresIn: string | number) : number=> {
	let expiresInSeconds: number = 0;
        
  if (typeof expiresIn === 'string') {

		switch (expiresIn.slice(-1)) {
			case 's':
				expiresInSeconds = parseInt(expiresIn);
				break;
			case 'm':
				expiresInSeconds = parseInt(expiresIn) * 60;
				break;
			case 'h':
				expiresInSeconds = parseInt(expiresIn) * 60 * 60;
				break;
			case 'd':
				expiresInSeconds = parseInt(expiresIn) * 60 * 60 * 24;
				break;
		}

  }

	return expiresInSeconds;
}