import React, { useEffect, useState, useRef } from 'react';
import styles from './css/UserTable.module.css';
import AdminService, { User } from '../../services/AdminService';

interface UserTableProps {
    users: User[];
    onUpdateUser: (userId: string, data: any) => void;
}

const UserRow: React.FC<{ user: User; onUpdateUser: (userId: string, data: any) => void }> = ({ user, onUpdateUser }) => {
    const [stats, setStats] = useState<any>(null);
    const rowRef = useRef<HTMLTableRowElement>(null);

    useEffect(() => {
        let mounted = true;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !stats) {
                Promise.all([
                    AdminService.getUserOverview(user.id),
                    AdminService.getUserMediaStats(user.id)
                ]).then(([overview, media]) => {
                    if (mounted) setStats({ ...overview, ...media });
                }).catch(err => console.error(err));
                observer.disconnect();
            }
        }, { rootMargin: '50px' });

        if (rowRef.current) {
            observer.observe(rowRef.current);
        }

        return () => {
            mounted = false;
            observer.disconnect();
        };
    }, [user.id, stats]);

    return (
        <tr ref={rowRef}>
            <td>
                <div className={styles.userInfo}>
                    <span className={styles.email}>{user.email}</span>
                    <span className={styles.id}>{user.id}</span>
                </div>
            </td>
            <td className={styles.wordCount}>{stats ? stats.wordCount : '...'}</td>
            <td className={styles.metricValue}>{stats ? stats.resourceCount : '...'}</td>
            <td className={styles.metricValue}>{stats ? stats.subtitleCount : '...'}</td>
            <td>
                <select
                    className={styles.select}
                    value={user.role}
                    onChange={(e) => onUpdateUser(user.id, { role: e.target.value })}
                >
                    <option value="USER">User</option>
                    <option value="SYSTEM_ADMIN">Admin</option>
                </select>
            </td>
            <td>
                <button
                    className={`${styles.premiumToggle} ${user.isPremium ? styles.premium : styles.free}`}
                    onClick={() => onUpdateUser(user.id, { isPremium: !user.isPremium })}
                >
                    {user.isPremium ? 'Premium' : 'Free'}
                </button>
            </td>
            <td className={styles.date}>{new Date(user.createdAt).toLocaleDateString()}</td>
        </tr>
    );
};

const UserTable: React.FC<UserTableProps> = ({ users, onUpdateUser }) => {
    return (
        <div className={styles.wrapper}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Words</th>
                        <th>Dictionary</th>
                        <th>Subtitles</th>
                        <th>Role</th>
                        <th>Subscription</th>
                        <th>Joined</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <UserRow 
                            key={user.id} 
                            user={user} 
                            onUpdateUser={onUpdateUser} 
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UserTable;
