import { NavLink } from 'react-router-dom';
import styles from './Nav.module.css';

export default function Nav() {
  return (
    <header className={styles.nav}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>✦</span>
        HuskyDiary
      </div>
      <nav className={styles.links}>
        <NavLink to="/"           end className={({ isActive }) => isActive ? styles.active : styles.link}>
          📅 Diary
        </NavLink>
        <NavLink to="/mood"      className={({ isActive }) => isActive ? styles.active : styles.link}>
          📊 Mood Week
        </NavLink>
      </nav>
    </header>
  );
}
