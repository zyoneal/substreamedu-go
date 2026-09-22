import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SubtitleService } from '../../services/SubtitleService';
import { AuthService } from '../../services/AuthService';
import styles from './css/SubtitlesPage.module.css';
import { useIntl } from "react-intl";
import BinButton from "../DictionaryItemsPage/BinButton";
import Search from 'lucide-react/dist/esm/icons/search';
import Upload from 'lucide-react/dist/esm/icons/upload';

interface SubtitleDto {
	name: string;
}

const SubtitlesPage: React.FC = () => {
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

	const filteredResources = Array.isArray(subtitles) ? subtitles.filter((subtitle) =>
		subtitle.name.toLowerCase().includes(searchQuery.toLowerCase())
	) : [];

	const parseDoTags = (message: string): (string | JSX.Element)[] => {
		const parts = message.split(/(<do>.*?<\/do>)/g);
		return parts.map((part: string, index: number) => {
			if (part.startsWith('<do>') && part.endsWith('</do>')) {
				const content = part.replace(/<\/?do>/g, '');
                return <span key={index} className={styles.accent}>{content}</span>;
			}
			return part;
		}).filter((part: string | JSX.Element) => part !== '');
	};

	return (
		<div className={styles.container}>
			<div className={styles.ambientGlow} />
			<div className={styles.content}>
				<div className={styles.headerGroup}>
					<span className={styles.eyebrow}>06 // SUBTITLES</span>
					<h1 className={styles.pageTitle}>
						{parseDoTags(intl.formatMessage({
							id: 'subtitlesTitle',
							defaultMessage: 'My <do>Subtitles</do>'
						}))}
					</h1>
				</div>

				<div className={styles.toolbar}>
					<div className={styles.searchInputWrapper}>
						<Search className={styles.searchIcon} size={16} />
						<input
							type="text"
							placeholder={intl.formatMessage({ id: "searchSubtitle", defaultMessage: "Search subtitle by name" })}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className={styles.searchInput}
						/>
					</div>
					<label className={styles.uploadButton}>
						<Upload size={16} />
						{intl.formatMessage({ id: "uploadSubtitles", defaultMessage: "Upload Subtitles" })}
						<input
							type="file"
							accept=".srt,.vtt"
							onChange={(e) => handleFileUpload(e.target.files)}
							className={styles.uploadInput}
						/>
					</label>
				</div>

				{error && <p className={styles.errorMessage}>{error}</p>}

				<div className={styles.subtitlesWrapper}>
					{isLoading ? (
						<div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
							<div className={styles.loader}>
								<p className={styles.loaderText}>Loading</p>
								<div className={styles.load}></div>
							</div>
						</div>
					) : filteredResources.length > 0 ? (
						<div className={styles.subtitlesList}>
							{filteredResources.map((subtitle, index) => (
								<div key={index} className={styles.subtitleCard}>
									<div className={styles.subtitleContent}>
										<Link to={`/subtitles/${subtitle.name}`} className={styles.subtitleLink}>
											<h3 className={styles.subtitleName}>{subtitle.name}</h3>
										</Link>
										<BinButton
											className={styles.deleteButton}
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
							<h3 className={styles.emptyTitle}>No subtitles found</h3>
							<p className={styles.emptyDescription}>
								Upload your first subtitle file to begin reading and translating.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default SubtitlesPage;