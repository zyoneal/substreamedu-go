import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SubtitleService } from '../../services/SubtitleService';
import { AuthService } from '../../services/AuthService';
import styles from './css/SubtitlesPage.module.css';
import { useIntl } from 'react-intl';
import BinButton from '../DictionaryItemsPage/BinButton';
import { Search, Upload, FileText, X } from 'lucide-react';
import { usePixzenTheme } from '../HomePage/pixzen/usePixzenTheme';

interface SubtitleDto {
	name: string;
}

const SubtitlesPage: React.FC = () => {
	usePixzenTheme();
	const [subtitles, setSubtitles] = useState<SubtitleDto[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [error, setError] = useState<string>('');
	const [deletingName, setDeletingName] = useState<string | null>(null);
	const intl = useIntl();

	const fetchSubtitles = async () => {
		setIsLoading(true);
		setError('');
		if (!AuthService.getUserEmail()) {
			setSubtitles([]);
			setIsLoading(false);
			return;
		}
		try {
			const resources = await SubtitleService.fetchAllSubtitles();
			setSubtitles(resources);
		} catch {
			setError('Failed to load subtitles. Please try again later.');
		} finally {
			setIsLoading(false);
		}
	};

	const validateFileName = (fileName: string) => {
		const validNameRegex = /^[a-zA-Z0-9._-]+$/;
		if (!validNameRegex.test(fileName)) {
			return 'Invalid file name. Please use alphanumeric characters, dots, and underscores only.';
		}
		if (fileName.length > 50) {
			return 'File name is too long. Please use a shorter name (less than 50 characters).';
		}
		return '';
	};

	const handleFileUpload = async (files: FileList | null) => {
		if (!files || !files[0]) return;
		const file = files[0];

		const fileNameValidationError = validateFileName(file.name);
		if (fileNameValidationError) {
			setError(fileNameValidationError);
			return;
		}

		try {
			const formData = new FormData();
			formData.append('file', file);

			await SubtitleService.uploadSubtitles(formData);
			await fetchSubtitles();
		} catch {
			setError('Failed to upload subtitles. Please try again.');
		}
	};

	const deleteSubtitlesByName = async (name: string) => {
		if (deletingName) return;
		setDeletingName(name);
		setError('');
		try {
			await SubtitleService.deleteSubtitlesByName(name);
			setSubtitles((prevResources) =>
				prevResources.filter((resource) => resource.name !== name)
			);
		} catch (err) {
			if (err instanceof Error) {
				setError(err.message);
			}
		} finally {
			setDeletingName(null);
		}
	};

	useEffect(() => {
		fetchSubtitles();
	}, []);

	const filteredResources = Array.isArray(subtitles)
		? subtitles.filter((subtitle) =>
				subtitle.name.toLowerCase().includes(searchQuery.toLowerCase())
		  )
		: [];

	const stripDoTags = (message: string): string => {
		return message.replace(/<\/?do>/g, '');
	};

	return (
		<div className={styles.container}>
			<div className="pixzenGrain" aria-hidden="true" />
			<div className={styles.content}>
				<div className={styles.topBar}>
					<h1 className={styles.pageTitle}>
						{stripDoTags(
							intl.formatMessage({
								id: 'subtitlesTitle',
								defaultMessage: 'My Subtitles',
							})
						)}
					</h1>
					<div className={styles.countBadge}>
						<span className={styles.counterDot} aria-hidden="true" />
						<span>
							{filteredResources.length}{' '}
							{filteredResources.length === 1 ? 'file' : 'files'}
						</span>
					</div>
				</div>

				<div className={styles.toolbar}>
					<div className={styles.searchInputWrapper}>
						<Search className={styles.searchIcon} size={18} aria-hidden="true" />
						<input
							type="text"
							placeholder={intl.formatMessage({
								id: 'searchSubtitle',
								defaultMessage: 'Search subtitle by name...',
							})}
							aria-label={intl.formatMessage({
								id: 'searchSubtitle',
								defaultMessage: 'Search subtitle by name',
							})}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className={styles.searchInput}
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery('')}
								className={styles.clearButton}
								aria-label="Clear search query"
							>
								<X size={16} />
							</button>
						)}
					</div>
					<label className={styles.uploadButton}>
						<Upload size={15} aria-hidden="true" />
						<span>
							{intl.formatMessage({
								id: 'uploadSubtitles',
								defaultMessage: 'Upload Subtitles',
							})}
						</span>
						<input
							type="file"
							accept=".srt,.vtt"
							aria-label={intl.formatMessage({
								id: 'uploadSubtitles',
								defaultMessage: 'Upload Subtitles',
							})}
							onChange={(e) => handleFileUpload(e.target.files)}
							className={styles.uploadInput}
						/>
					</label>
				</div>

				{error && <p className={styles.errorMessage}>{error}</p>}

				<div className={styles.subtitlesWrapper}>
					{isLoading ? (
						<div className={styles.loadingState}>
							<div className={styles.spinner} aria-hidden="true" />
							<p className={styles.loadingText}>Loading subtitles...</p>
						</div>
					) : filteredResources.length > 0 ? (
						<div className={styles.subtitlesList}>
							{filteredResources.map((subtitle, index) => (
								<div key={index} className={styles.subtitleCard}>
									<div className={styles.subtitleContent}>
										<Link
											to={`/subtitles/${subtitle.name}`}
											className={styles.subtitleLink}
										>
											<div className={styles.subtitleIconBox} aria-hidden="true">
												<FileText size={18} />
											</div>
											<div className={styles.subtitleMeta}>
												<h3 className={styles.subtitleName}>{subtitle.name}</h3>
												<span className={styles.subtitleFormat}>SRT · VTT</span>
											</div>
										</Link>
										<BinButton
											className={styles.deleteButton}
											ariaLabel={`Delete ${subtitle.name}`}
											disabled={deletingName === subtitle.name}
											onClick={(e) => {
												e.preventDefault();
												deleteSubtitlesByName(subtitle.name);
											}}
										/>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className={styles.emptyState}>
							<div className={styles.emptyIconBox} aria-hidden="true">
								<FileText size={22} />
							</div>
							<h3 className={styles.emptyTitle}>No subtitles found</h3>
							<p className={styles.emptyDescription}>
								Upload your first subtitle file (.srt or .vtt) to begin reading and translating.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default SubtitlesPage;