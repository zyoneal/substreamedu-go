import {Link} from 'react-router-dom';

const NotFoundPage = () => {
	return (
			<div className="flex flex-col gap-4 justify-center items-center h-full px-4 sm:px-8">
				<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-ink">
					404 - Page Not Found
				</h1>
				<p className="text-lg sm:text-xl text-body text-center">
					Unfortunately, the requested page does not exist.
				</p>
				<Link
						to="/"
						className="text-base sm:text-lg md:text-xl text-primary hover:underline mt-4"
				>
					Return to the homepage
				</Link>
			</div>
	);
};

export default NotFoundPage;