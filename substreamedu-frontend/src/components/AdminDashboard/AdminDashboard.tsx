import React, { useEffect, useState } from 'react';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Activity from 'lucide-react/dist/esm/icons/activity';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Users from 'lucide-react/dist/esm/icons/users';
import Play from 'lucide-react/dist/esm/icons/play';
import MousePointer from 'lucide-react/dist/esm/icons/mouse-pointer';
import Bookmark from 'lucide-react/dist/esm/icons/bookmark';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import styles from './css/AdminDashboard.module.css';
import AdminService, { User, AnalyticsSummary } from '../../services/AdminService';
import UserTable from './UserTable';

const AdminDashboard: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [isPremiumFilter, setIsPremiumFilter] = useState<boolean | undefined>(undefined);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('DESC');
    const [topUsers, setTopUsers] = useState<{user: User, wordCount: number}[] | null>(null);
    const [showTopUsers, setShowTopUsers] = useState(false);
    const [isLoadingTop, setIsLoadingTop] = useState(false);
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
    const [showEventsLog, setShowEventsLog] = useState(false);
    const [eventFilter, setEventFilter] = useState('all');
    const limit = 20;

    useEffect(() => {
        fetchUsers();
    }, [page, searchQuery, isPremiumFilter, sortBy, sortOrder]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setIsLoadingAnalytics(true);
        try {
            const data = await AdminService.getAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setIsLoadingAnalytics(false);
        }
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await AdminService.getUsers(limit, page * limit, searchQuery, isPremiumFilter, sortBy, sortOrder);
            setUsers(data.users);
            setTotalUsers(data.total);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };


    const handleUpdateUser = async (userId: string, updateData: any) => {
        try {
            const updatedUser = await AdminService.updateUser(userId, updateData);
            setUsers(users.map(u => u.id === userId ? updatedUser : u));
        } catch (error) {
            console.error('Failed to update user:', error);
            alert('Error updating user');
        }
    };

    const handleShowTopUsers = async () => {
        setShowTopUsers(true);
        if (topUsers) return;
        
        setIsLoadingTop(true);
        try {
            const topStats = await AdminService.getTopUsersByWords(10);
            
            const enrichedUsers = await Promise.all(
                topStats.map(async (stat) => {
                    try {
                        const user = await AdminService.getUserById(stat.userId);
                        return { user, wordCount: stat.wordCount };
                    } catch {
                        return { user: null, wordCount: stat.wordCount };
                    }
                })
            );
            
            setTopUsers(enrichedUsers.filter(u => u.user !== null) as {user: User, wordCount: number}[]);
        } catch (error) {
            console.error('Failed to fetch top users:', error);
        } finally {
            setIsLoadingTop(false);
        }
    };

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const [field, order] = e.target.value.split(':');
        setSortBy(field);
        setSortOrder(order);
    };

    const totalPages = Math.ceil(totalUsers / limit);

    const renderPagination = () => {
        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(0, page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(0, endPage - maxVisiblePages + 1);
        }

        if (startPage > 0) {
            pages.push(
                <button key={0} className={styles.pageButton} onClick={() => setPage(0)}>1</button>
            );
            if (startPage > 1) pages.push(<span key="dots-1" className={styles.dots}>...</span>);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    className={`${styles.pageButton} ${page === i ? styles.activePage : ''}`}
                    onClick={() => setPage(i)}
                >
                    {i + 1}
                </button>
            );
        }

        if (endPage < totalPages - 1) {
            if (endPage < totalPages - 2) pages.push(<span key="dots-2" className={styles.dots}>...</span>);
            pages.push(
                <button key={totalPages - 1} className={styles.pageButton} onClick={() => setPage(totalPages - 1)}>
                    {totalPages}
                </button>
            );
        }

        return (
            <div className={styles.pagination}>
                <button
                    className={styles.pageButton}
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                >
                    Prev
                </button>
                {pages}
                <button
                    className={styles.pageButton}
                    disabled={page === totalPages - 1}
                    onClick={() => setPage(page + 1)}
                >
                    Next
                </button>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Admin Panel</h1>
                <div className={styles.searchContainer}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search by email..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(0); 
                        }}
                    />
                </div>
                <div className={styles.filters}>
                    <button
                        className={`${styles.filterButton} ${isPremiumFilter === true ? styles.activeFilter : ''}`}
                        onClick={() => {
                            setIsPremiumFilter(isPremiumFilter === true ? undefined : true);
                            setPage(0);
                        }}
                    >
                        Premium Only
                    </button>
                    <select 
                        className={styles.filterSelect}
                        value={`${sortBy}:${sortOrder}`}
                        onChange={handleSortChange}
                    >
                        <option value="created_at:DESC">Newest First</option>
                        <option value="created_at:ASC">Oldest First</option>
                        <option value="email:ASC">Email (A-Z)</option>
                    </select>
                    
                    <button className={styles.premiumToggle} onClick={handleShowTopUsers}>
                        <Trophy size={16} className="inline mr-1.5 text-primary" /> Top Users
                    </button>
                </div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Users</div>
                    <div className={styles.statValue}>{totalUsers}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Premium Users</div>
                    <div className={styles.statValue}>
                        {users.filter(u => u.isPremium).length} <span style={{ fontSize: '1rem', color: 'var(--text-secondary, #4A4A4A)' }}>(this page)</span>
                    </div>
                </div>
            </div>

            {/* Activation Funnel & Telemetry */}
            <div className={styles.funnelSection}>
                <div className={styles.funnelHeader}>
                    <div className={styles.funnelTitle}>
                        <Activity size={22} className="text-primary" />
                        <span>Activation Funnel (Self-Hosted Telemetry)</span>
                        {analytics?.funnel && (
                            <>
                                <span className={styles.activationBadge} title="Share of all visitors who selected ≥1 word (select_word / totalVisitors)">
                                    ⚡ Visitor Activation: {analytics.funnel.activationRate.toFixed(1)}%
                                </span>
                                <span className={styles.registeredActivationBadge} title="Share of registered users who selected ≥1 word (select_word / signup)">
                                    👥 Registered Activation: {
                                        analytics.funnel.registeredActivationRate !== undefined
                                            ? analytics.funnel.registeredActivationRate.toFixed(1)
                                            : (analytics.funnel.signups > 0
                                                ? ((analytics.funnel.wordSelected / analytics.funnel.signups) * 100).toFixed(1)
                                                : '0.0')
                                    }%
                                </span>
                            </>
                        )}
                    </div>
                    <button
                        className={styles.eventsToggleBtn}
                        onClick={fetchAnalytics}
                        disabled={isLoadingAnalytics}
                        title="Refresh analytics data"
                    >
                        <RefreshCw size={15} className={isLoadingAnalytics ? 'animate-spin' : ''} />
                        <span>{isLoadingAnalytics ? 'Updating...' : 'Refresh Telemetry'}</span>
                    </button>
                </div>

                {analytics?.funnel ? (
                    <div className={styles.funnelCardsRow}>
                        <div className={styles.funnelCard}>
                            <div className={styles.funnelCardHeader}>
                                <span>1. Visitors</span>
                                <Users size={16} />
                            </div>
                            <div className={styles.funnelCardValue}>{analytics.funnel.totalVisitors}</div>
                            <div className={styles.funnelCardRate}>All unique sessions</div>
                        </div>

                        <div className={styles.funnelCard}>
                            <div className={styles.funnelCardHeader}>
                                <span>2. Opened Player</span>
                                <Play size={16} />
                            </div>
                            <div className={styles.funnelCardValue}>{analytics.funnel.playerOpened}</div>
                            <div className={styles.funnelCardRate}>
                                {analytics.funnel.totalVisitors > 0
                                    ? `${((analytics.funnel.playerOpened / analytics.funnel.totalVisitors) * 100).toFixed(1)}% of visitors`
                                    : '0%'}
                            </div>
                        </div>

                        <div className={styles.funnelCard}>
                            <div className={styles.funnelCardHeader}>
                                <span>3. Selected Word</span>
                                <MousePointer size={16} />
                            </div>
                            <div className={styles.funnelCardValue}>{analytics.funnel.wordSelected}</div>
                            <div className={styles.funnelCardRate}>
                                {analytics.funnel.playerOpened > 0
                                    ? `${((analytics.funnel.wordSelected / analytics.funnel.playerOpened) * 100).toFixed(1)}% of players`
                                    : '0%'}
                            </div>
                        </div>

                        <div className={styles.funnelCard}>
                            <div className={styles.funnelCardHeader}>
                                <span>4. Saved Word</span>
                                <Bookmark size={16} />
                            </div>
                            <div className={styles.funnelCardValue}>{analytics.funnel.wordSaved}</div>
                            <div className={styles.funnelCardRate}>
                                {analytics.funnel.wordSelected > 0
                                    ? `${((analytics.funnel.wordSaved / analytics.funnel.wordSelected) * 100).toFixed(1)}% of selects`
                                    : '0%'}
                            </div>
                        </div>

                        <div className={styles.funnelCard}>
                            <div className={styles.funnelCardHeader}>
                                <span>Signups</span>
                                <UserPlus size={16} />
                            </div>
                            <div className={styles.funnelCardValue}>{analytics.funnel.signups}</div>
                            <div className={styles.funnelCardRate}>
                                Guest saves: {analytics.funnel.guestSavesAttempted}
                            </div>
                        </div>

                        <div className={styles.funnelCard}>
                            <div className={styles.funnelCardHeader}>
                                <span>Return D2</span>
                                <Calendar size={16} />
                            </div>
                            <div className={styles.funnelCardValue}>{analytics.funnel.returnD2}</div>
                            <div className={styles.funnelCardRate}>
                                {analytics.funnel.signups > 0
                                    ? `${((analytics.funnel.returnD2 / analytics.funnel.signups) * 100).toFixed(1)}% retention`
                                    : '0%'}
                            </div>
                        </div>
                    </div>
                ) : isLoadingAnalytics ? (
                    <div className={styles.loadingStats}>Loading telemetry data...</div>
                ) : (
                    <div className={styles.loadingStats}>No analytics data available yet. Events will appear as users interact.</div>
                )}

                {analytics && (
                    <div className={styles.funnelActionsRow}>
                        <button
                            className={styles.eventsToggleBtn}
                            onClick={() => setShowEventsLog(!showEventsLog)}
                        >
                            {showEventsLog ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            <span>{showEventsLog ? 'Hide Live Event Stream' : `Show Live Event Stream (${analytics.recentEvents?.length || 0})`}</span>
                        </button>

                        {showEventsLog && (
                            <div className="flex items-center gap-2">
                                <select
                                    className={styles.filterSelect}
                                    value={eventFilter}
                                    onChange={(e) => setEventFilter(e.target.value)}
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                                >
                                    <option value="all">All Events ({analytics.recentEvents?.length || 0})</option>
                                    <option value="open_player">open_player</option>
                                    <option value="select_word">select_word</option>
                                    <option value="save_word">save_word</option>
                                    <option value="signup">signup</option>
                                    <option value="return_d2">return_d2</option>
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {showEventsLog && analytics?.recentEvents && (
                    <div className={styles.eventsTableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: '80px' }}>ID</th>
                                    <th style={{ width: '150px' }}>Event</th>
                                    <th>User / Anon ID</th>
                                    <th>Details</th>
                                    <th style={{ width: '180px' }}>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.recentEvents
                                    .filter(e => eventFilter === 'all' || e.eventName === eventFilter)
                                    .map((evt) => {
                                        let badgeClass = styles.badgeDefault;
                                        if (evt.eventName === 'open_player') badgeClass = styles.badgeOpenPlayer;
                                        else if (evt.eventName === 'select_word') badgeClass = styles.badgeSelectWord;
                                        else if (evt.eventName === 'save_word') badgeClass = styles.badgeSaveWord;
                                        else if (evt.eventName === 'signup') badgeClass = styles.badgeSignup;
                                        else if (evt.eventName === 'return_d2') badgeClass = styles.badgeReturnD2;

                                        return (
                                            <tr key={evt.id}>
                                                <td style={{ color: '#777', fontSize: '0.8rem' }}>#{evt.id}</td>
                                                <td>
                                                    <span className={`${styles.eventBadge} ${badgeClass}`}>
                                                        {evt.eventName}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>
                                                    {evt.userId ? (
                                                        <span style={{ color: '#60a5fa' }}>User: {evt.userId.slice(0, 8)}...</span>
                                                    ) : evt.anonymousId ? (
                                                        <span style={{ color: '#a0a0a0' }}>Anon: {evt.anonymousId.slice(0, 10)}...</span>
                                                    ) : (
                                                        <span style={{ color: '#666' }}>anonymous</span>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: '0.82rem', color: '#ccc' }}>
                                                    {evt.properties && Object.keys(evt.properties).length > 0 ? (
                                                        <code>{JSON.stringify(evt.properties)}</code>
                                                    ) : (
                                                        <span style={{ color: '#555' }}>—</span>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: '0.82rem', color: '#888' }}>
                                                    {new Date(evt.createdAt).toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className={styles.tableContainer}>
                {isLoading ? (
                    <div className={styles.loading}>Loading users...</div>
                ) : (
                    <UserTable
                        users={users}
                        onUpdateUser={handleUpdateUser}
                    />
                )}
            </div>

            {totalPages > 1 && renderPagination()}

            {showTopUsers && (
                <div className={styles.modalBackdrop} onClick={() => setShowTopUsers(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2><Trophy size={20} className="inline mr-2 text-primary" /> Top Users by Words</h2>
                            <button className={styles.closeButton} onClick={() => setShowTopUsers(false)}>×</button>
                        </div>
                        <div className={styles.detailsList}>
                            {isLoadingTop ? (
                                <div className={styles.loadingStats}>Loading top users...</div>
                            ) : topUsers ? (
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Email</th>
                                            <th>Words</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topUsers.map((item, index) => (
                                            <tr key={item.user.id}>
                                                <td>#{index + 1}</td>
                                                <td>{item.user.email}</td>
                                                <td><strong>{item.wordCount}</strong></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className={styles.loadingStats}>No data available</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminDashboard;
