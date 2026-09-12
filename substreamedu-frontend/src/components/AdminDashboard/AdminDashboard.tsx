import React, { useEffect, useState } from 'react';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import styles from './css/AdminDashboard.module.css';
import AdminService, { User } from '../../services/AdminService';
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
    const limit = 20;

    useEffect(() => {
        fetchUsers();
    }, [page, searchQuery, isPremiumFilter, sortBy, sortOrder]);

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
