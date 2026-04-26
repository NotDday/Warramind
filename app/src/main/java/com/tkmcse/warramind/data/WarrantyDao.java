package com.tkmcse.warramind.data;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.Query;
import androidx.room.Update;

import com.tkmcse.warramind.Warranty;

import java.util.List;

@Dao
public interface WarrantyDao {
    @Insert
    void insert(Warranty warranty);
    @Query("SELECT * FROM warranties")
    List<Warranty> getAllWarranties();
    @Query("SELECT * FROM warranties WHERE id = :id LIMIT 1")
    Warranty getWarrantyById(int id);
    @Query("DELETE FROM warranties WHERE id = :id")
    void deleteById(int id);

    @Update
    void update(Warranty warranty);

}
