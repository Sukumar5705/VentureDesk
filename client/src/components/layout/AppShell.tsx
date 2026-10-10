import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import styles from './AppShell.module.css';

export function AppShell() {
  return (
    <div className={styles.canvas}>
      <div className={styles.frame}>
        <Sidebar />
        <main className={styles.workspace} id="main-content">
          <div className={styles.content}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
